using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
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
            ViewData["Genres"] = _context.Genres
                .Select(g => g.GenreName)   // ← use your actual property name
                .ToList();
            return View();
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
