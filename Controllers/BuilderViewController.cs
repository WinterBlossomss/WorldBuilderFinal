using Microsoft.AspNetCore.Authorization;
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

            var category = world.Categories.ToList();
            // CatIDPK is int, ScriptCatFK is string -> convert before querying
            var categoryIds = world.Categories
                .Select(c => c.CatIDPK)
                .ToList();

            foreach (var cat in category)
            {
                var sub = await _context.SubCategories
                    .Where(sc => sc.SubCatFK == cat.CatIDPK)
                    .ToListAsync();
                cat.SubCategoryCount = sub.Count;
                foreach (var s in sub)
                {
                    var scriptCount = await _context.Scripts
                        .Where(s => s.ScriptSubFK == s.ScriptSubFK)
                        .CountAsync();
                }
            }

            var scripts = await _context.Scripts
                .Where(s => categoryIds.Contains(s.ScriptCatFK))
                .ToListAsync();

            builderView.SelectedWorld = world;
            builderView.Categories = world.Categories;
            builderView.Tags = world.Tags;
            builderView.Scripts = scripts;

            builderView.WorldGenre = world.WorldGenFKNavigation;
            builderView.TotalScripts = scripts.Count;       // use the queried list
            builderView.TotalCategories = world.Categories?.Count ?? 0;
            builderView.TotalSubCategories = world.Categories?.SelectMany(c => c.SubCategories).Count() ?? 0;
            builderView.TotalTags = world.Tags?.Count ?? 0;

            return View(builderView);
        }

        [HttpGet]
        public async Task<ActionResult> getSubFromCat(int catID)
        {
            var subs = await _context.Categories
                .Where(c => c.CatIDPK == catID)
                .SelectMany(c => c.SubCategories)
                .Select(sc => new
                {
                    sc.SubIDPK,
                    sc.SubName
                })
                .ToListAsync();
            return Json(subs);
        }

        [HttpGet]
        public async Task<IActionResult> OutlineData(int worldId)
        {
            var cats = await _context.Categories
                .Where(c => c.CatWorldFK == worldId)
                .OrderBy(c => c.CatName).ToListAsync();
            var catIds = cats.Select(c => c.CatIDPK).ToList();

            var subs = await _context.SubCategories
                .Where(s => catIds.Contains(s.SubCatFK))
                .OrderBy(s => s.SubName).ToListAsync();

            var scripts = await _context.Scripts
                .Where(s => catIds.Contains(s.ScriptCatFK))
                .Select(s => new
                {
                    id = s.ScriptIDPK,
                    title = s.ScriptTitle,
                    catFk = s.ScriptCatFK,
                    subFk = s.ScriptSubFK,
                    edited = s.ScriptUpdateAt ?? s.ScriptCreateAt,
                    links = _context.ScriptScripts.Count(ss =>
                        ss.ScriptScriptOneFK == s.ScriptIDPK || ss.ScriptScriptTwoFK == s.ScriptIDPK),
                    tags = s.ScriptTagTagFKs.Select(t => new { name = t.TagName, color = t.TagColor }).ToList()
                }).ToListAsync();

            var tree = cats.Select(c => new
            {
                id = c.CatIDPK,
                name = c.CatName,
                color = c.CatColor,
                scriptCount = scripts.Count(s => s.catFk == c.CatIDPK),
                directScripts = scripts.Where(s => s.catFk == c.CatIDPK && s.subFk == 0).ToList(),
                subs = subs.Where(su => su.SubCatFK == c.CatIDPK).Select(su => new
                {
                    id = su.SubIDPK,
                    name = su.SubName,
                    scripts = scripts.Where(s => s.subFk == su.SubIDPK).ToList()
                }).ToList()
            }).ToList();

            return Json(new { totalScripts = scripts.Count, totalCats = cats.Count, cats = tree });
        }

        [HttpGet]
        public async Task<IActionResult> CardData(int worldId)
        {
            var cats = await _context.Categories
                .Where(c => c.CatWorldFK == worldId)
                .OrderBy(c => c.CatName)
                .ToListAsync();
            var catIds = cats.Select(c => c.CatIDPK).ToList();

            var subs = await _context.SubCategories
                .Where(s => catIds.Contains(s.SubCatFK))
                .ToListAsync();
            var subNameById = subs.ToDictionary(s => s.SubIDPK, s => s.SubName);

            var scripts = await _context.Scripts
                .Where(s => catIds.Contains(s.ScriptCatFK))
                .Select(s => new
                {
                    id = s.ScriptIDPK,
                    title = s.ScriptTitle,
                    content = s.ScriptContent,
                    catFk = s.ScriptCatFK,
                    subFk = s.ScriptSubFK,
                    edited = s.ScriptUpdateAt ?? s.ScriptCreateAt,
                    links = _context.ScriptScripts.Count(ss =>
                        ss.ScriptScriptOneFK == s.ScriptIDPK || ss.ScriptScriptTwoFK == s.ScriptIDPK)
                })
                .ToListAsync();

            var cardCats = cats.Select(c => new
            {
                id = c.CatIDPK,
                name = c.CatName,
                color = c.CatColor,
                scripts = scripts.Where(s => s.catFk == c.CatIDPK)
                    .Select(s => new
                    {
                        s.id,
                        s.title,
                        snippet = string.IsNullOrEmpty(s.content) ? "" :
                            (s.content.Length > 100 ? s.content.Substring(0, 100) + "…" : s.content),
                        subName = s.subFk > 0 && subNameById.ContainsKey(s.subFk) ? subNameById[s.subFk] : null,
                        s.edited,
                        s.links
                    }).ToList()
            }).ToList();

            return Json(new { totalScripts = scripts.Count, totalCats = cats.Count, cats = cardCats });
        }

        // GET: /BuilderView/BoardLinks?worldId=#
        [HttpGet]
        public async Task<IActionResult> BoardLinks(int worldId)
        {
            var catIds = await _context.Categories
                .Where(c => c.CatWorldFK == worldId)
                .Select(c => c.CatIDPK)
                .ToListAsync();

            var scriptIds = await _context.Scripts
                .Where(s => catIds.Contains(s.ScriptCatFK))
                .Select(s => s.ScriptIDPK)
                .ToListAsync();

            var links = await _context.ScriptScripts
                .Where(ss => scriptIds.Contains(ss.ScriptScriptOneFK)
                          && scriptIds.Contains(ss.ScriptScriptTwoFK))
                .Select(ss => new
                {
                    oneId = ss.ScriptScriptOneFK,
                    twoId = ss.ScriptScriptTwoFK,
                    label = ss.ScriptScriptConnFKNavigation.ConnDescr,
                    loose = false
                })
                .ToListAsync();

            return Json(links);
        }

        // POST: /BuilderView/SavePosition   body: { scriptId, x, y }
        public class BoardPosDto
        {
            public int ScriptId { get; set; }
            public double X { get; set; }
            public double Y { get; set; }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> SavePosition([FromBody] BoardPosDto dto)
        {
            var script = await _context.Scripts.FirstOrDefaultAsync(s => s.ScriptIDPK == dto.ScriptId);
            if (script == null) return NotFound();
            if (dto.X < 0)
                script.ScriptBoardX = 0;
            else
                script.ScriptBoardX = dto.X;
            if (dto.Y < 0)
                script.ScriptBoardY = 0;
            else
                script.ScriptBoardY = dto.Y;
            await _context.SaveChangesAsync();
            return Ok();
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