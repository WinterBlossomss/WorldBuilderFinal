using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using System.Security.Cryptography;
using WorldBuilder.Models;

namespace WorldBuilder.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly WorldBuilderDBContext _context;
        private readonly UserManager<IdentityUser> _userManager;

        public HomeController(ILogger<HomeController> logger, WorldBuilderDBContext context, UserManager<IdentityUser> userManager)
        {
            _logger = logger;
            _context = context;
            _userManager = userManager;
        }

        public async Task<IActionResult> Index()
        {
            // Everything the page shows comes from the database.
            var worlds = _context.Worlds
                .Include(w => w.Pictures)
                .Include(w => w.Categories)
                .Include(w => w.Tags)
                .Include(w => w.WorldUserFKNavigation)
                .ToList();

            var model = new HomeViewModel
            {
                WorldList = worlds,
                UserList = _context.UserInfos.ToList(),
                CategoryList = _context.Categories.ToList(),
                TagList = _context.Tags.ToList()
            };

            // "Latest worlds" grid: newest public worlds first.
            ViewData["LatestWorlds"] = worlds
                .Where(w => w.WorldIsPublic)
                .OrderByDescending(w => w.WorldUpdatedAt ?? w.WorldCreatedAt)
                .ThenByDescending(w => w.WorldIDPK)
                .Take(5)
                .ToList();

            // "Popular worlds, by genre": each entry carries the world id + likes
            // so the registry list can deep-link straight to World/Details.
            var genres = _context.Genres
                .Select(g => new GenreViewModel
                {
                    Name = g.GenreName,
                    Color = g.GenreColor,
                    Worlds = g.Worlds
                        .Where(w => w.WorldIsPublic)
                        .OrderByDescending(w => w.WorldLikes ?? 0)
                        .Take(5)
                        .Select(w => new GenreWorldItem
                        {
                            Id = w.WorldIDPK,
                            Name = w.WorldName,
                            Likes = w.WorldLikes ?? 0
                        })
                        .ToList()
                })
                .ToList();

            // Only show genres that actually have public worlds.
            ViewData["Genres"] = genres.Where(g => g.Worlds.Any()).ToList();
            var uid = _userManager.GetUserId((System.Security.Claims.ClaimsPrincipal)User);
            var me = await _context.UserInfos
                   .FirstOrDefaultAsync(u => u.UserInfoUserIDFK == uid);

            ViewData["UserInfoId"] = me?.UserInfoIDPK;
            return View(model);
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}