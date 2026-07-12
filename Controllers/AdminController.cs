using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldBuilder.Models;

namespace WorldBuilder.Controllers
{
    [Authorize(Roles = "Admin")]
    public class AdminController : Controller
    {
        private readonly WorldBuilderDBContext _context;
        private readonly UserManager<IdentityUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;

        public AdminController(WorldBuilderDBContext context,
                               UserManager<IdentityUser> userManager,
                               RoleManager<IdentityRole> roleManager)
        {
            _context = context;
            _userManager = userManager;
            _roleManager = roleManager;
        }

        public async Task<IActionResult> Index(string q)
        {
            // ----- users (Identity) joined with UserInfo (domain) -----
            var identityUsers = await _userManager.Users.ToListAsync();
            var infos = await _context.UserInfos.ToListAsync();
            var infoByUid = infos.ToDictionary(i => i.UserInfoUserIDFK, i => i);

            // per-builder world + like tallies
            var worldAgg = await _context.Worlds
                .GroupBy(w => w.WorldUserFK)
                .Select(g => new { UserInfoId = g.Key, Worlds = g.Count(), Likes = g.Sum(w => (int?)w.WorldLikes) ?? 0 })
                .ToListAsync();
            var worldsByInfo = worldAgg.ToDictionary(a => a.UserInfoId, a => a);

            var rows = new List<AdminUserRow>();
            foreach (var iu in identityUsers)
            {
                infoByUid.TryGetValue(iu.Id, out var info);
                var roles = await _userManager.GetRolesAsync(iu);
                var agg = info != null && worldsByInfo.TryGetValue(info.UserInfoIDPK, out var a) ? a : null;
                bool locked = iu.LockoutEnd != null && iu.LockoutEnd > DateTimeOffset.UtcNow;

                rows.Add(new AdminUserRow
                {
                    IdentityId = iu.Id,
                    Handle = info?.UserInfoProN ?? iu.UserName,
                    Email = iu.Email,
                    Role = roles.FirstOrDefault() ?? "User",
                    Worlds = agg?.Worlds ?? 0,
                    Likes = agg?.Likes ?? 0,
                    Joined = info?.UserInfoCreatedAt,
                    Locked = locked
                });
            }

            if (!string.IsNullOrWhiteSpace(q))
            {
                var term = q.Trim().ToLower();
                rows = rows.Where(r =>
                    (r.Handle ?? "").ToLower().Contains(term) ||
                    (r.Email ?? "").ToLower().Contains(term)).ToList();
            }
            rows = rows.OrderByDescending(r => r.Joined).ToList();

            // ----- stats -----
            var vm = new AdminDashboard
            {
                Query = q,
                Users = rows,
                TotalWorlds = await _context.Worlds.CountAsync(),
                ActiveBuilders = worldAgg.Count,
                CreatorNodes = await _context.Categories.CountAsync(),
                LockedUsers = rows.Count(r => r.Locked),
                AllRoles = (await _roleManager.Roles.Select(r => r.Name).ToListAsync())
            };

            // pending genre requests
            vm.PendingRequests = await _context.Set<GenreRequest>()
                .Include(r => r.GenreReqUserFKNavigation)
                .Where(r => r.GenreReqStatus == "pending")
                .OrderBy(r => r.GenreReqCreatedAt)
                .ToListAsync();

            // most used genres (by world count)
            vm.MostUsedGenres = await _context.Worlds
                .GroupBy(w => w.WorldGenFK)
                .Select(g => new NameCount { Name = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count).Take(6).ToListAsync();

            // most-liked genres (by summed world likes)
            vm.MostLikedGenres = await _context.Worlds
                .GroupBy(w => w.WorldGenFK)
                .Select(g => new NameCount { Name = g.Key, Count = g.Sum(w => (int?)w.WorldLikes) ?? 0 })
                .OrderByDescending(x => x.Count).Take(4).ToListAsync();

            // most used tags
            vm.MostUsedTags = await _context.Tags
                .GroupBy(t => t.TagName)
                .Select(g => new NameCount { Name = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count).Take(9).ToListAsync();

            ViewData["Title"] = "Admin";
            return View(vm);
        }

        // ----- genre requests -----
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ApproveRequest(int id)
        {
            var req = await _context.Set<GenreRequest>().FindAsync(id);
            if (req == null) return NotFound();

            if (!await _context.Genres.AnyAsync(g => g.GenreName == req.GenreReqName))
            {
                _context.Genres.Add(new Genre
                {
                    GenreName = req.GenreReqName,
                    GenreDescription = req.GenreReqReason
                });
            }
            req.GenreReqStatus = "approved";
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> RejectRequest(int id)
        {
            var req = await _context.Set<GenreRequest>().FindAsync(id);
            if (req == null) return NotFound();
            req.GenreReqStatus = "rejected";
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }

        // ----- create a genre directly (admin "Create a new genre" modal) -----
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateGenre(string GenreName, string GenreDescription, string GenreColor)
        {
            if (!string.IsNullOrWhiteSpace(GenreName)
                && !await _context.Genres.AnyAsync(g => g.GenreName == GenreName))
            {
                _context.Genres.Add(new Genre
                {
                    GenreName = GenreName.Trim(),
                    GenreDescription = GenreDescription,
                    GenreColor = string.IsNullOrWhiteSpace(GenreColor) ? null : GenreColor
                });
                await _context.SaveChangesAsync();
            }
            return RedirectToAction(nameof(Index));
        }

        // ----- role + lock management -----
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SetRole(string userId, string role)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();
            if (!await _roleManager.RoleExistsAsync(role))
                await _roleManager.CreateAsync(new IdentityRole(role));

            var current = await _userManager.GetRolesAsync(user);
            await _userManager.RemoveFromRolesAsync(user, current);
            await _userManager.AddToRoleAsync(user, role);
            return RedirectToAction(nameof(Index));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ToggleLock(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound();

            bool locked = user.LockoutEnd != null && user.LockoutEnd > DateTimeOffset.UtcNow;
            if (locked)
                await _userManager.SetLockoutEndDateAsync(user, null);
            else
            {
                await _userManager.SetLockoutEnabledAsync(user, true);
                await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddYears(100));
            }
            return RedirectToAction(nameof(Index));
        }
    }

    public class AdminDashboard
    {
        public string Query { get; set; }
        public List<AdminUserRow> Users { get; set; } = new();
        public List<GenreRequest> PendingRequests { get; set; } = new();
        public List<string> AllRoles { get; set; } = new();

        public int TotalWorlds { get; set; }
        public int ActiveBuilders { get; set; }
        public int CreatorNodes { get; set; }
        public int LockedUsers { get; set; }

        public List<NameCount> MostUsedGenres { get; set; } = new();
        public List<NameCount> MostLikedGenres { get; set; } = new();
        public List<NameCount> MostUsedTags { get; set; } = new();
    }

    public class AdminUserRow
    {
        public string IdentityId { get; set; }
        public string Handle { get; set; }
        public string Email { get; set; }
        public string Role { get; set; }
        public int Worlds { get; set; }
        public int Likes { get; set; }
        public DateTime? Joined { get; set; }
        public bool Locked { get; set; }
    }

    public class NameCount
    {
        public string Name { get; set; }
        public int Count { get; set; }
    }
}
