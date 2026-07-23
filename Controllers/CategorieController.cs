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

    // POST: Categorie/DeleteAjax/5
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteAjax(int catidpk)
    {
        var category = await _context.Categories.FindAsync(catidpk);
        if (category == null)
            return NotFound();

        try
        {
            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return BadRequest("Category still has sub-categories or scripts attached.");
        }

        return Json(new { success = true, id = catidpk });
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
}