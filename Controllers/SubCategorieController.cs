
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldBuilder.Models;

public class SubCategorieController : Controller
{
    private readonly WorldBuilderDBContext _context;

    public SubCategorieController(WorldBuilderDBContext context)
    {
        _context = context;
    }

    // GET: SUBCATEGORYS
    public async Task<IActionResult> Index()    
    {
        return View(await _context.SubCategories.ToListAsync());
    }

    // GET: SUBCATEGORYS/Details/5
    public async Task<IActionResult> Details(int? subidpk)
    {
        if (subidpk == null)
        {
            return NotFound();
        }

        var subcategory = await _context.SubCategories
            .FirstOrDefaultAsync(m => m.SubIDPK == subidpk);
        if (subcategory == null)
        {
            return NotFound();
        }

        return View(subcategory);
    }

    // GET: SUBCATEGORYS/Create
    public IActionResult Create()
    {
        return View();
    }

    // POST: SUBCATEGORYS/Create
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create([Bind("SubIDPK,SubName,SubDescription,SubCatFK,Pictures,SubCatFKNavigation")] SubCategory subcategory)
    {
        if (ModelState.IsValid)
        {
            _context.Add(subcategory);
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }
        return View(subcategory);
    }

    // GET: SUBCATEGORYS/Edit/5
    public async Task<IActionResult> Edit(int? subidpk)
    {
        if (subidpk == null)
        {
            return NotFound();
        }

        var subcategory = await _context.SubCategories.FindAsync(subidpk);
        if (subcategory == null)
        {
            return NotFound();
        }
        return View(subcategory);
    }

    // POST: SUBCATEGORYS/Edit/5
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int? subidpk, [Bind("SubIDPK,SubName,SubDescription,SubCatFK,Pictures,SubCatFKNavigation")] SubCategory subcategory)
    {
        if (subidpk != subcategory.SubIDPK)
        {
            return NotFound();
        }

        if (ModelState.IsValid)
        {
            try
            {
                _context.Update(subcategory);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!SubCategoryExists(subcategory.SubIDPK))
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
        return View(subcategory);
    }

    // GET: SUBCATEGORYS/Delete/5
    public async Task<IActionResult> Delete(int? subidpk)
    {
        if (subidpk == null)
        {
            return NotFound();
        }

        var subcategory = await _context.SubCategories
            .FirstOrDefaultAsync(m => m.SubIDPK == subidpk);
        if (subcategory == null)
        {
            return NotFound();
        }

        return View(subcategory);
    }

    // POST: SUBCATEGORYS/Delete/5
    [HttpPost, ActionName("Delete")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteConfirmed(int? subidpk)
    {
        var subcategory = await _context.SubCategories.FindAsync(subidpk);
        if (subcategory != null)
        {
            _context.SubCategories.Remove(subcategory);
        }

        await _context.SaveChangesAsync();
        return RedirectToAction(nameof(Index));
    }

    private bool SubCategoryExists(int? subidpk)
    {
        return _context.SubCategories.Any(e => e.SubIDPK == subidpk);
    }
}
