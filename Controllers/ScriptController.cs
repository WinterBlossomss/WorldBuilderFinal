
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
        return View(await _context.Scripts.ToListAsync());
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
    public IActionResult Create()
    {
        return View();
    }

    // POST: SCRIPTS/Create
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create([Bind("ScriptIDPK,ScriptContent,ScriptTitle,ScriptCatFK,ScriptSubFK,ScriptUpdateAt,ScriptCreateAt,ScriptIsPublic,ScriptIsChar,ScriptBoardX,ScriptBoardY,ScriptBoardColor,DetailViews,ScriptLikes,ScriptScriptScriptScriptOneFKNavigations,ScriptScriptScriptScriptTwoFKNavigations,PicScriptPicFKs,ScriptTagTagFKs")] Script script)
    {
        if (ModelState.IsValid)
        {
            _context.Add(script);
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }
        return View(script);
    }

    // GET: SCRIPTS/Edit/5
    public async Task<IActionResult> Edit(int? scriptidpk)
    {
        if (scriptidpk == null)
        {
            return NotFound();
        }

        var script = await _context.Scripts.FindAsync(scriptidpk);
        if (script == null)
        {
            return NotFound();
        }
        return View(script);
    }

    // POST: SCRIPTS/Edit/5
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int? scriptidpk, [Bind("ScriptIDPK,ScriptContent,ScriptTitle,ScriptCatFK,ScriptSubFK,ScriptUpdateAt,ScriptCreateAt,ScriptIsPublic,ScriptIsChar,ScriptBoardX,ScriptBoardY,ScriptBoardColor,DetailViews,ScriptLikes,ScriptScriptScriptScriptOneFKNavigations,ScriptScriptScriptScriptTwoFKNavigations,PicScriptPicFKs,ScriptTagTagFKs")] Script script)
    {
        if (scriptidpk != script.ScriptIDPK)
        {
            return NotFound();
        }

        if (ModelState.IsValid)
        {
            try
            {
                _context.Update(script);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ScriptExists(script.ScriptIDPK))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }
            return RedirectToAction(nameof(Index));
        }
        return View(script);
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
