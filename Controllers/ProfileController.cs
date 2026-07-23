using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using WorldBuilder.Models;

namespace WorldBuilder.Controllers
{
    // Lets a signed-in user edit their username (Identity account), pronouns and bio.
    // Reached from the drawer's "Settings" entry.
    [Authorize]
    public class ProfileController : Controller
    {
        private readonly WorldBuilderDBContext _context;
        private readonly UserManager<IdentityUser> _userManager;
        private readonly SignInManager<IdentityUser> _signInManager;

        public ProfileController(WorldBuilderDBContext context,
                                 UserManager<IdentityUser> userManager,
                                 SignInManager<IdentityUser> signInManager)
        {
            _context = context;
            _userManager = userManager;
            _signInManager = signInManager;
        }

        // Loads the current user's UserInfo, creating one if it's missing (safety net for
        // accounts that predate UserInfo-on-registration).
        private async Task<UserInfo> GetOrCreateMineAsync(string uid)
        {
            var me = await _context.UserInfos.FirstOrDefaultAsync(u => u.UserInfoUserIDFK == uid);
            if (me == null)
            {
                me = new UserInfo
                {
                    UserInfoUserIDFK = uid,
                    UserInfoCreatedAt = DateTime.UtcNow
                };
                _context.UserInfos.Add(me);
                await _context.SaveChangesAsync();
            }
            return me;
        }

        // GET: /Profile/Edit
        public async Task<IActionResult> Edit()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Challenge();

            var me = await GetOrCreateMineAsync(user.Id);

            ViewData["Title"] = "Edit profile";
            ViewData["MyAuthorId"] = me.UserInfoIDPK;

            return View(new ProfileEditViewModel
            {
                Username = user.UserName,
                Pronouns = me.UserInfoProN,   // UserInfoProN = pronouns
                Bio = me.UserInfoBio
            });
        }

        // POST: /Profile/Edit
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(ProfileEditViewModel vm)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Challenge();

            var me = await GetOrCreateMineAsync(user.Id);

            ViewData["Title"] = "Edit profile";
            ViewData["MyAuthorId"] = me.UserInfoIDPK;

            if (!ModelState.IsValid)
                return View(vm);

            // Username lives on the Identity account. Only touch it if it actually changed,
            // so the uniqueness check doesn't fire against the user's own current name.
            var newUsername = vm.Username?.Trim();
            if (!string.IsNullOrWhiteSpace(newUsername) &&
                !string.Equals(newUsername, user.UserName, StringComparison.Ordinal))
            {
                var setResult = await _userManager.SetUserNameAsync(user, newUsername);
                if (!setResult.Succeeded)
                {
                    foreach (var e in setResult.Errors)
                        ModelState.AddModelError(nameof(vm.Username), e.Description);
                    return View(vm);
                }
            }

            // Pronouns + bio live on the domain profile row.
            me.UserInfoProN = string.IsNullOrWhiteSpace(vm.Pronouns) ? null : vm.Pronouns.Trim();
            me.UserInfoBio = string.IsNullOrWhiteSpace(vm.Bio) ? null : vm.Bio.Trim();
            await _context.SaveChangesAsync();

            // Refresh the auth cookie so the new username shows immediately.
            await _signInManager.RefreshSignInAsync(user);

            TempData["ProfileSaved"] = "Your profile has been updated.";
            return RedirectToAction(nameof(Edit));
        }
    }

    public class ProfileEditViewModel
    {
        [Required]
        [Display(Name = "Username")]
        [StringLength(15, ErrorMessage = "Username can be at most {1} characters.")]
        public string Username { get; set; } = string.Empty;

        [Display(Name = "Pronouns")]
        [StringLength(10, ErrorMessage = "Pronouns can be at most {1} characters.")]
        public string? Pronouns { get; set; }

        [Display(Name = "Bio")]
        [StringLength(500, ErrorMessage = "Bio can be at most {1} characters.")]
        public string? Bio { get; set; }
    }
}