using Microsoft.AspNet.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldBuilder.Models;

namespace WorldBuilder.ViewComponents
{
    // Renders the slide-in navigation drawer with real, per-user data.
    // Used from _Layout.cshtml:  @await Component.InvokeAsync("Drawer")
    public class DrawerViewComponent : ViewComponent
    {
        private readonly WorldBuilderDBContext _context;
        private readonly Microsoft.AspNetCore.Identity.UserManager<IdentityUser> _userManager;

        public DrawerViewComponent(WorldBuilderDBContext context, Microsoft.AspNetCore.Identity.UserManager<IdentityUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public async Task<IViewComponentResult> InvokeAsync()
        {
            var vm = new DrawerViewModel
            {
                IsAuthenticated = User.Identity?.IsAuthenticated == true,
                IsAdmin = User.IsInRole("Admin"),
                TotalWorlds = await _context.Worlds.CountAsync(w => w.WorldIsPublic)
            };

            if (vm.IsAuthenticated)
            {
                var uid = _userManager.GetUserId((System.Security.Claims.ClaimsPrincipal)User);
                var me = await _context.UserInfos
                    .FirstOrDefaultAsync(u => u.UserInfoUserIDFK == uid);

                if (me != null)
                {
                    vm.UserInfoId = me.UserInfoIDPK;
                    vm.Handle = _userManager.GetUserName((System.Security.Claims.ClaimsPrincipal)User);

                    var myWorldIds = await _context.Worlds
                        .Where(w => w.WorldUserFK == me.UserInfoIDPK)
                        .Select(w => w.WorldIDPK)
                        .ToListAsync();
                    vm.MyWorlds = myWorldIds.Count;

                    var myCatIds = await _context.Categories
                        .Where(c => c.CatWorldFK != null && myWorldIds.Contains(c.CatWorldFK.Value))
                        .Select(c => c.CatIDPK)
                        .ToListAsync();
                    vm.MyScripts = await _context.Scripts.CountAsync(s => myCatIds.Contains(s.ScriptCatFK));

                    vm.LikedWorlds = await _context.Worlds
                        .CountAsync(w => w.WorldLikUserFKs.Any(u => u.UserInfoIDPK == me.UserInfoIDPK));
                }
                else
                {
                    vm.Handle = User.Identity!.Name;
                }
            }

            return View(vm);
        }
    }

    public class DrawerViewModel
    {
        public bool IsAuthenticated { get; set; }
        public bool IsAdmin { get; set; }
        public int? UserInfoId { get; set; }
        public string Handle { get; set; }
        public int TotalWorlds { get; set; }
        public int MyWorlds { get; set; }
        public int MyScripts { get; set; }
        public int LikedWorlds { get; set; }

        public string Initial
        {
            get
            {
                var h = (Handle ?? "").TrimStart('@');
                return string.IsNullOrEmpty(h) ? "?" : h.Substring(0, 1).ToUpper();
            }
        }
    }
}
