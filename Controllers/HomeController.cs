using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using WorldBuilder.Models;

namespace WorldBuilder.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly WorldBuilderDBContext _context;

        public HomeController(ILogger<HomeController> logger, WorldBuilderDBContext context)
        {
            _logger = logger;
            _context = context;
        }

        public IActionResult Index()
        {
            var worlds = _context.Worlds
                .Include(w => w.Pictures)
                .Include(w => w.Categories)
                .Include(w => w.Tags)
                .ToList();

            HomeViewModel model = new HomeViewModel
            {
                WorldList = worlds,
                UserList = _context.UserInfos.ToList(),
                CategoryList = _context.Categories.ToList(),
                TagList = _context.Tags.ToList()
            };



            ViewData["Genres"] = _context.Genres
            .Select(g => new GenreViewModel
            {
                Name = g.GenreName,
                Worlds = g.Worlds
                    .Select(w => w.WorldName)
                    .Take(5)
                    .ToList()
            })
            .ToList();
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