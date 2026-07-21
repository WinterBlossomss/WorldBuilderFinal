using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using WorldBuilder.Models;

[Authorize]
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

    private async Task<int?> CurrentAuthorIdAsync()
    {
        var uid = User.FindFirstValue(ClaimTypes.NameIdentifier); // Identity user id (string)
        if (string.IsNullOrEmpty(uid)) return null;

        return await _context.UserInfos
            .Where(u => u.UserInfoUserIDFK == uid)
            .Select(u => (int?)u.UserInfoIDPK)
            .FirstOrDefaultAsync();
    }

    // GET: SCRIPTS/Details/5
    public async Task<IActionResult> Details(int? scriptidpk)
    {
        if (scriptidpk == null) return NotFound();

        var script = await _context.Scripts
            .Include(s => s.ScriptTagTagFKs)
            .Include(s => s.PicScriptPicFKs)
            .Include(s => s.DetailViews).ThenInclude(dv => dv.DVAttFKNavigation)
            .Include(s => s.DetailViews).ThenInclude(dv => dv.DVPicFKNavigation)
            .FirstOrDefaultAsync(m => m.ScriptIDPK == scriptidpk);
        if (script == null) return NotFound();

        var cat = await _context.Categories
            .FirstOrDefaultAsync(c => c.CatIDPK == script.ScriptCatFK);

        var sub = script.ScriptSubFK > 0
            ? await _context.SubCategories.FirstOrDefaultAsync(s => s.SubIDPK == script.ScriptSubFK)
            : null;

        var world = cat == null ? null
            : await _context.Worlds
                .Include(w => w.WorldUserFKNavigation)
                .FirstOrDefaultAsync(w => w.WorldIDPK == cat.CatWorldFK);

        ViewData["World"] = world;                                    // World
        ViewData["CatId"] = cat?.CatIDPK;                             // int?
        ViewData["CatName"] = cat?.CatName;                             // string
        ViewData["SubName"] = sub?.SubName;                             // string
        ViewData["AuthorHandle"] = world?.WorldUserFKNavigation?.UserInfoProN; // string

        // ---- infobox: the DetailView rows, ordered by AttOrder ----
        var dvs = script.DetailViews
            .OrderBy(dv => dv.DVAttFKNavigation?.AttOrder ?? 0)
            .ToList();

        // header row is the only one carrying a title / portrait (see DetailController.SaveAjax)
        var header = dvs.FirstOrDefault(dv => dv.DVTitle != null || dv.DVPicFK != null)
                     ?? dvs.FirstOrDefault();

        var infoRows = new List<WorldBuilder.Models.Attribute>();            // reuse the Attribute entity
        if (header != null)
        {
            ViewData["InfoEnabled"] = header.DVAttFKNavigation?.AttIsSection ?? true;
            ViewData["InfoTitle"] = header.DVTitle;                       // string
            ViewData["PortraitPath"] = header.DVPicFKNavigation?.PicPath;    // string

            foreach (var dv in dvs)
            {
                if (dv == header) continue;
                if (dv.DVAttFKNavigation != null) infoRows.Add(dv.DVAttFKNavigation);
            }
        }
        else
        {
            ViewData["InfoEnabled"] = false;
        }
        ViewData["InfoRows"] = infoRows;   // List<Attribute>

        // ---- linked scripts, grouped by relation type ----
        var edges = await _context.ScriptScripts
            .Include(e => e.ScriptScriptConnFKNavigation)
            .Include(e => e.ScriptScriptOneFKNavigation)
            .Include(e => e.ScriptScriptTwoFKNavigation)
            .Where(e => e.ScriptScriptOneFK == script.ScriptIDPK
                     || e.ScriptScriptTwoFK == script.ScriptIDPK)
            .ToListAsync();

        // label -> the "other" Script entities (reusing Script, no wrapper type)
        var groups = new Dictionary<string, List<Script>>();
        foreach (var e in edges)
        {
            var other = e.ScriptScriptOneFK == script.ScriptIDPK
                ? e.ScriptScriptTwoFKNavigation
                : e.ScriptScriptOneFKNavigation;
            if (other == null) continue;

            var label = e.ScriptScriptConnFKNavigation?.ConnDescr ?? "Related";
            if (!groups.TryGetValue(label, out var list))
                groups[label] = list = new List<Script>();
            list.Add(other);
        }

        var linkCatIds = groups.Values.SelectMany(v => v)
            .Select(s => s.ScriptCatFK).Distinct().ToList();
        var linkCatNames = await _context.Categories
            .Where(c => linkCatIds.Contains(c.CatIDPK))
            .ToDictionaryAsync(c => c.CatIDPK, c => c.CatName);

        ViewData["LinkGroups"] = groups;         // Dictionary<string, List<Script>>
        ViewData["LinkCatNames"] = linkCatNames;   // Dictionary<int, string>

        return View(script);   // Views/Script/Details.cshtml — model is the Script entity
    }

    // GET: SCRIPTS/Create
    public async Task<IActionResult> Create(int? catID, int? subID, int? worldID)
    {
        var script = new WorldBuilder.Models.Script { ScriptCreateAt = DateTime.UtcNow };
        int? resolvedWorldId = worldID;

        if (subID is > 0)
        {
            var sub = await _context.SubCategories
                .Include(s => s.SubCatFKNavigation)
                .FirstOrDefaultAsync(s => s.SubIDPK == subID);
            if (sub == null) return NotFound();

            script.ScriptSubFK = sub.SubIDPK;
            script.ScriptCatFK = sub.SubCatFK;
            ViewData["SubName"] = sub.SubName;
            ViewData["CatName"] = sub.SubCatFKNavigation?.CatName;   // was assigning the whole nav object

            resolvedWorldId ??= sub.SubCatFKNavigation?.CatWorldFK;
        }

        if (catID is > 0)
        {
            var cat = await _context.Categories
                .FirstOrDefaultAsync(c => c.CatIDPK == catID);
            if (cat == null) return NotFound();

            script.ScriptCatFK = cat.CatIDPK;
            ViewData["CatName"] = cat.CatName;
            resolvedWorldId ??= cat.CatWorldFK;
        }

        var world = await _context.Worlds
            .FirstOrDefaultAsync(w => w.WorldIDPK == resolvedWorldId);

        if (world == null) return NotFound();   // fail safely instead of handing null to the view

        return View(new BuilderView { NewScript = script, SelectedWorld = world });
    }

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

        var me = await CurrentAuthorIdAsync();

        var ownerId = await _context.Categories
            .Where(c => c.CatIDPK == script.ScriptCatFK)
            .Join(_context.Worlds,
                  c => c.CatWorldFK,
                  w => w.WorldIDPK,
                  (c, w) => (int?)w.WorldUserFK)
            .FirstOrDefaultAsync();

        if (me == null || ownerId == null || ownerId != me)
            return Forbid();

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

        var me = await CurrentAuthorIdAsync();

        var ownerId = await _context.Categories
            .Where(c => c.CatIDPK == script.ScriptCatFK)
            .Join(_context.Worlds,
                  c => c.CatWorldFK,
                  w => w.WorldIDPK,
                  (c, w) => (int?)w.WorldUserFK)
            .FirstOrDefaultAsync();

        if (me == null || ownerId == null || ownerId != me)
            return Forbid();

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