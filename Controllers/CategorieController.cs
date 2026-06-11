
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldBuilder.Models;

public class CategorieController : Controller
{
    private readonly WorldBuilderDBContext _context;

    public CategorieController(WorldBuilderDBContext context)
    {
        _context = context;
    }

    // GET: CATEGORYS
    public async Task<IActionResult> Index()    
    {
        return View(await _context.Categories.ToListAsync());
    }

    // GET: CATEGORYS/Details/5
    public async Task<IActionResult> Details(int? catidpk)
    {
        if (catidpk == null)
        {
            return NotFound();
        }

        var category = await _context.Categories
            .FirstOrDefaultAsync(m => m.CatIDPK == catidpk);
        if (category == null)
        {
            return NotFound();
        }

        return View(category);
    }

    // GET: CATEGORYS/Create
    public IActionResult Create()
    {
        return View();
    }

    // POST: CATEGORYS/Create
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(int worldId, string name, string color)
    {
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(color))
            return BadRequest("Name and color are required.");

        var category = new Category
        {
            CatName = name,
            CatColor = color,
            CatWorldFK = worldId
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return Json(new { category.CatIDPK, category.CatName, category.CatColor });
    }

    // GET: CATEGORYS/Edit/5
    public async Task<IActionResult> Edit(int? catidpk)
    {
        if (catidpk == null)
        {
            return NotFound();
        }

        var category = await _context.Categories.FindAsync(catidpk);
        if (category == null)
        {
            return NotFound();
        }
        return View(category);
    }

    // POST: CATEGORYS/Edit/5
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int? catidpk, [Bind("CatIDPK,CatName,CatDescription,CatWorldFK,CatColor,CatWorldFKNavigation,Pictures,SubCategories")] Category category)
    {
        if (catidpk != category.CatIDPK)
        {
            return NotFound();
        }

        if (ModelState.IsValid)
        {
            try
            {
                _context.Update(category);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!CategoryExists(category.CatIDPK))
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
        return View(category);
    }

    // GET: CATEGORYS/Delete/5
    public async Task<IActionResult> Delete(int? catidpk)
    {
        if (catidpk == null)
        {
            return NotFound();
        }

        var category = await _context.Categories
            .FirstOrDefaultAsync(m => m.CatIDPK == catidpk);
        if (category == null)
        {
            return NotFound();
        }

        return View(category);
    }

    // POST: CATEGORYS/Delete/5
    [HttpPost, ActionName("Delete")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteConfirmed(int? catidpk)
    {
        var category = await _context.Categories.FindAsync(catidpk);
        if (category != null)
        {
            _context.Categories.Remove(category);
        }

        await _context.SaveChangesAsync();
        return RedirectToAction(nameof(Index));
    }

    private bool CategoryExists(int? catidpk)
    {
        return _context.Categories.Any(e => e.CatIDPK == catidpk);
    }
}
