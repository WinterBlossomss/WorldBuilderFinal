
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldBuilder.Models;

public class TagController : Controller
{
    private readonly WorldBuilderDBContext _context;

    public TagController(WorldBuilderDBContext context)
    {
        _context = context;
    }

    // GET: TAGS
    public async Task<IActionResult> Index()    
    {
        return View(await _context.Tags.ToListAsync());
    }

    // GET: TAGS/Details/5
    public async Task<IActionResult> Details(int? tagidpk)
    {
        if (tagidpk == null)
        {
            return NotFound();
        }

        var tag = await _context.Tags
            .FirstOrDefaultAsync(m => m.TagIDPK == tagidpk);
        if (tag == null)
        {
            return NotFound();
        }

        return View(tag);
    }

    // GET: TAGS/Create
    public IActionResult Create()
    {
        return View();
    }

    // POST: TAGS/Create
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create([Bind("TagName,TagDescription,TagColor")] Tag tag)
    {
        if (ModelState.IsValid)
        {
            //Need to put world fk and user fk manually

            _context.Add(tag);
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }
        return View(tag);
    }

    // GET: TAGS/Edit/5
    public async Task<IActionResult> Edit(int? tagidpk)
    {
        if (tagidpk == null)
        {
            return NotFound();
        }

        var tag = await _context.Tags.FindAsync(tagidpk);
        if (tag == null)
        {
            return NotFound();
        }
        return View(tag);
    }

    // POST: TAGS/Edit/5
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int? tagidpk, [Bind("TagIDPK,TagName,TagDescription,TagColor,TagWorldFK,TagUserFK,TagUserFKNavigation,TagWorldFKNavigation,ScriptTagScriptFKs")] Tag tag)
    {
        if (tagidpk != tag.TagIDPK)
        {
            return NotFound();
        }

        if (ModelState.IsValid)
        {
            try
            {
                _context.Update(tag);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TagExists(tag.TagIDPK))
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
        return View(tag);
    }

    // GET: TAGS/Delete/5
    public async Task<IActionResult> Delete(int? tagidpk)
    {
        if (tagidpk == null)
        {
            return NotFound();
        }

        var tag = await _context.Tags
            .FirstOrDefaultAsync(m => m.TagIDPK == tagidpk);
        if (tag == null)
        {
            return NotFound();
        }

        return View(tag);
    }

    // POST: TAGS/Delete/5
    [HttpPost, ActionName("Delete")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteConfirmed(int? tagidpk)
    {
        var tag = await _context.Tags.FindAsync(tagidpk);
        if (tag != null)
        {
            _context.Tags.Remove(tag);
        }

        await _context.SaveChangesAsync();
        return RedirectToAction(nameof(Index));
    }

    private bool TagExists(int? tagidpk)
    {
        return _context.Tags.Any(e => e.TagIDPK == tagidpk);
    }
}
