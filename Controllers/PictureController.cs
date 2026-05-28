
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldBuilder.Models;

public class PictureController : Controller
{
    private readonly WorldBuilderDBContext _context;

    public PictureController(WorldBuilderDBContext context)
    {
        _context = context;
    }

    // GET: PICTURES
    public async Task<IActionResult> Index()    
    {
        return View(await _context.Pictures.ToListAsync());
    }

    // GET: PICTURES/Details/5
    public async Task<IActionResult> Details(int? picidpk)
    {
        if (picidpk == null)
        {
            return NotFound();
        }

        var picture = await _context.Pictures
            .FirstOrDefaultAsync(m => m.PicIDPK == picidpk);
        if (picture == null)
        {
            return NotFound();
        }

        return View(picture);
    }

    // GET: PICTURES/Create
    public IActionResult Create()
    {
        return View();
    }

    // POST: PICTURES/Create
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create([Bind("PicIDPK,PicCaption,PicPath,PicSubFK,PicCatFK,PicWorldFK,DetailViews,PicCatFKNavigation,PicSubFKNavigation,PicWorldFKNavigation,PicScriptScriptFKs")] Picture picture)
    {
        if (ModelState.IsValid)
        {
            _context.Add(picture);
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }
        return View(picture);
    }

    // GET: PICTURES/Edit/5
    public async Task<IActionResult> Edit(int? picidpk)
    {
        if (picidpk == null)
        {
            return NotFound();
        }

        var picture = await _context.Pictures.FindAsync(picidpk);
        if (picture == null)
        {
            return NotFound();
        }
        return View(picture);
    }

    // POST: PICTURES/Edit/5
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int? picidpk, [Bind("PicIDPK,PicCaption,PicPath,PicSubFK,PicCatFK,PicWorldFK,DetailViews,PicCatFKNavigation,PicSubFKNavigation,PicWorldFKNavigation,PicScriptScriptFKs")] Picture picture)
    {
        if (picidpk != picture.PicIDPK)
        {
            return NotFound();
        }

        if (ModelState.IsValid)
        {
            try
            {
                _context.Update(picture);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!PictureExists(picture.PicIDPK))
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
        return View(picture);
    }

    // GET: PICTURES/Delete/5
    public async Task<IActionResult> Delete(int? picidpk)
    {
        if (picidpk == null)
        {
            return NotFound();
        }

        var picture = await _context.Pictures
            .FirstOrDefaultAsync(m => m.PicIDPK == picidpk);
        if (picture == null)
        {
            return NotFound();
        }

        return View(picture);
    }

    // POST: PICTURES/Delete/5
    [HttpPost, ActionName("Delete")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteConfirmed(int? picidpk)
    {
        var picture = await _context.Pictures.FindAsync(picidpk);
        if (picture != null)
        {
            _context.Pictures.Remove(picture);
        }

        await _context.SaveChangesAsync();
        return RedirectToAction(nameof(Index));
    }

    private bool PictureExists(int? picidpk)
    {
        return _context.Pictures.Any(e => e.PicIDPK == picidpk);
    }
}
