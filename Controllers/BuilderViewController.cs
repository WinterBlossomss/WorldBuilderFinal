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

            builderView.SelectedWorld = world;



            return View(builderView);
        }

        // GET: BuilderViewController/Details/5
        public ActionResult Details(int id)
        {
            return View();
        }

        // GET: BuilderViewController/Create
        public ActionResult Create()
        {
            return View();
        }

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
