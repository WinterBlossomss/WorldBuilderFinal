using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldBuilder.Models;

public class ScriptController : Controller
{
    private readonly WorldBuilderDBContext _context;

    public ScriptController(WorldBuilderDBContext context)
    {
        _context = context;
    }

    // GET: SCRIPTS
    public async Task<IActionResult> Index()
    {
        return View();
    }

    // GET: SCRIPTS/Details/5
    public async Task<IActionResult> Details(int? scriptidpk)
    {
        if (scriptidpk == null)
        {
            return NotFound();
        }

        var script = await _context.Scripts
            .FirstOrDefaultAsync(m => m.ScriptIDPK == scriptidpk);
        if (script == null)
        {
            return NotFound();
        }

        return View(script);
    }

    // GET: SCRIPTS/Create
    public async Task<IActionResult> Create(int? catID, int? subID, int? worldID)
    {
        var script = new WorldBuilder.Models.Script
        {
            ScriptCreateAt = DateTime.UtcNow
        };

        if (subID is > 0)
        {
            var sub = await _context.SubCategories
                .Include(s => s.SubCatFKNavigation)
                .FirstOrDefaultAsync(s => s.SubIDPK == subID);

            if (sub == null) return NotFound();

            script.ScriptSubFK = sub.SubIDPK;
            script.ScriptCatFK = sub.SubCatFK;

            ViewData["SubName"] = sub.SubName;
            ViewData["CatName"] = sub.SubCatFKNavigation;
        }
        if (catID is > 0)
        {
            var cat = await _context.Categories
                .FirstOrDefaultAsync(c => c.CatIDPK == catID);

            if (cat == null) return NotFound();

            script.ScriptCatFK = cat.CatIDPK;
            ViewData["CatName"] = cat.CatName;
        }

        var world = await _context.Worlds
            .FirstOrDefaultAsync(w => w.WorldIDPK == worldID);

        //var tags = await _context.Tags
        //    .Where(t => t.TagWorldFK == worldID)
        //    .ToListAsync();

        //var tagsCount = tags.Count();

        var builderView = new BuilderView
        {
            NewScript = script,
            SelectedWorld = world,
            //Tags = tags,
            //TotalTags = tagsCount
        };

        return View(builderView);
    }

    // POST: SCRIPTS/Create
    // POST: SCRIPTS/Create  — persist, then go to Edit where relations live
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(
        [Bind("ScriptContent,ScriptTitle,ScriptCatFK,ScriptSubFK,ScriptIsPublic,ScriptIsChar,ScriptBoardColor")]
    WorldBuilder.Models.Script script,
        int[] tagIds, int[] pictureIds)
    {
        script.ScriptCreateAt = DateTime.UtcNow;   // set server-side, don't trust the form

        if (tagIds is { Length: > 0 })
        {
            var tags = await _context.Tags.Where(t => tagIds.Contains(t.TagIDPK)).ToListAsync();
            foreach (var t in tags) script.ScriptTagTagFKs.Add(t);
        }
        if (pictureIds is { Length: > 0 })
        {
            var pics = await _context.Pictures.Where(p => pictureIds.Contains(p.PicIDPK)).ToListAsync();
            foreach (var p in pics) script.PicScriptPicFKs.Add(p);
        }

        _context.Add(script);
        await _context.SaveChangesAsync();

        return RedirectToAction(nameof(Edit), new { id = script.ScriptIDPK });
    }

    // GET: SCRIPTS/Edit/5  — renders the SAME Create view, now with a real id
    public async Task<IActionResult> Edit(int? id)
    {
        if (id == null) return NotFound();

        var script = await _context.Scripts
            .Include(s => s.ScriptTagTagFKs)
            .Include(s => s.PicScriptPicFKs)
            .FirstOrDefaultAsync(s => s.ScriptIDPK == id);
        if (script == null) return NotFound();

        var cat = await _context.Categories.FirstOrDefaultAsync(c => c.CatIDPK == script.ScriptCatFK);

        World world = cat == null ? null
            : await _context.Worlds.FirstOrDefaultAsync(w => w.WorldIDPK == cat.CatWorldFK);

        var tags = world == null ? new List<Tag>()
            : await _context.Tags.Where(t => t.TagWorldFK == world.WorldIDPK).ToListAsync();

        ViewData["CatName"] = cat?.CatName;
        if (script.ScriptSubFK > 0)
        {
            var sub = await _context.SubCategories.FirstOrDefaultAsync(s => s.SubIDPK == script.ScriptSubFK);
            ViewData["SubName"] = sub?.SubName;
        }

        return View("Create", new BuilderView
        {
            NewScript = script,
            SelectedWorld = world,
            Tags = tags,
            TotalTags = tags.Count
        });
    }

    // POST: SCRIPTS/Edit/5  — update title/content; ADD new tags/pictures (no removal yet)
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id,
    [Bind("ScriptTitle,ScriptContent")] WorldBuilder.Models.Script form,
    int[] tagIds, int[] pictureIds)
    {
        var script = await _context.Scripts
            .Include(s => s.ScriptTagTagFKs)
            .Include(s => s.PicScriptPicFKs)
            .FirstOrDefaultAsync(s => s.ScriptIDPK == id);
        if (script == null) return NotFound();

        script.ScriptTitle = form.ScriptTitle;
        script.ScriptContent = form.ScriptContent;
        script.ScriptUpdateAt = DateTime.UtcNow.ToLocalTime();

        // ---- TAGS: make the set exactly what was posted ----
        script.ScriptTagTagFKs.Clear();
        if (tagIds is { Length: > 0 })
        {
            var tags = await _context.Tags.Where(t => tagIds.Contains(t.TagIDPK)).ToListAsync();
            foreach (var t in tags) script.ScriptTagTagFKs.Add(t);
        }

        // ---- PICTURES: make the set exactly what was posted ----
        script.PicScriptPicFKs.Clear();
        if (pictureIds is { Length: > 0 })
        {
            var pics = await _context.Pictures.Where(p => pictureIds.Contains(p.PicIDPK)).ToListAsync();
            foreach (var p in pics) script.PicScriptPicFKs.Add(p);
        }

        await _context.SaveChangesAsync();
        return RedirectToAction(nameof(Edit), new { id });
    }

    // GET: SCRIPTS/Delete/5
    public async Task<IActionResult> Delete(int? scriptidpk)
    {
        if (scriptidpk == null)
        {
            return NotFound();
        }

        var script = await _context.Scripts
            .FirstOrDefaultAsync(m => m.ScriptIDPK == scriptidpk);
        if (script == null)
        {
            return NotFound();
        }

        return View(script);
    }

    // POST: SCRIPTS/Delete/5
    [HttpPost, ActionName("Delete")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteConfirmed(int? scriptidpk)
    {
        var script = await _context.Scripts.FindAsync(scriptidpk);
        if (script != null)
        {
            _context.Scripts.Remove(script);
        }

        await _context.SaveChangesAsync();
        return RedirectToAction(nameof(Index));
    }

    private bool ScriptExists(int? scriptidpk)
    {
        return _context.Scripts.Any(e => e.ScriptIDPK == scriptidpk);
    }
}