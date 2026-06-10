using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldBuilder.Models;

namespace WorldBuilder.Controllers
{
    [Authorize]
    public class BuilderViewController : Controller
    {
        private readonly WorldBuilderDBContext _context;
        private readonly UserManager<IdentityUser> _userManager;

        public BuilderViewController(WorldBuilderDBContext context, UserManager<IdentityUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }
        // GET: BuilderViewController
        public async Task<ActionResult> Index(int id)
        {
            BuilderView builderView = new BuilderView();

            var world = await _context.Worlds
                .Include(w => w.WorldGenFKNavigation)
                .Include(w => w.WorldUserFKNavigation)
                .Include(w => w.Pictures)
                .Include(w => w.Tags)
                .Include(w => w.Categories).ThenInclude(c => c.SubCategories).ThenInclude(sc => sc.Pictures)
                .Include(w => w.Categories).ThenInclude(c => c.Pictures)
                .FirstOrDefaultAsync(m => m.WorldIDPK == id);

            if (world == null)
                return NotFound();

            // CatIDPK is int, ScriptCatFK is string -> convert before querying
            var categoryIds = world.Categories
                .Select(c => c.CatIDPK.ToString())
                .ToList();

            var scripts = await _context.Scripts
                .Where(s => categoryIds.Contains(s.ScriptCatFK))
                .ToListAsync();

            builderView.SelectedWorld = world;
            builderView.Categories = world.Categories;
            builderView.Tags = world.Tags;
            builderView.Scripts = scripts;                 // <-- assign it

            builderView.WorldGenre = world.WorldGenFKNavigation;
            builderView.TotalScripts = scripts.Count;       // use the queried list
            builderView.TotalCategories = world.Categories?.Count ?? 0;
            builderView.TotalSubCategories = world.Categories?.SelectMany(c => c.SubCategories).Count() ?? 0;
            builderView.TotalTags = world.Tags?.Count ?? 0;

            return View(builderView);
        }

        // GET: BuilderViewController/Details/5
        public ActionResult Details(int id)
        {
            return View();
        }

        // GET: BuilderViewController/Create
        

        // POST: BuilderViewController/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Create(IFormCollection collection)
        {
            try
            {
                return RedirectToAction(nameof(Index));
            }
            catch
            {
                return View();
            }
        }

        // GET: BuilderViewController/Edit/5
        public ActionResult Edit(int id)
        {
            return View();
        }

        // POST: BuilderViewController/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Edit(int id, IFormCollection collection)
        {
            try
            {
                return RedirectToAction(nameof(Index));
            }
            catch
            {
                return View();
            }
        }

        // GET: BuilderViewController/Delete/5
        public ActionResult Delete(int id)
        {
            return View();
        }

        // POST: BuilderViewController/Delete/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Delete(int id, IFormCollection collection)
        {
            try
            {
                return RedirectToAction(nameof(Index));
            }
            catch
            {
                return View();
            }
        }
    }
}
