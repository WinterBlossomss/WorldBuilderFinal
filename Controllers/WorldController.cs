
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldBuilder.Models;

public class WorldController : Controller
{
    private readonly WorldBuilderDBContext _context;

    public WorldController(WorldBuilderDBContext context)
    {
        _context = context;
    }

    // GET: WORLDS
    public async Task<IActionResult> Index()    
    {
        return View(await _context.Worlds.ToListAsync());
    }

    // GET: WORLDS/Details/5
    public async Task<IActionResult> Details(int? worldidpk)
    {
        if (worldidpk == null)
        {
            return NotFound();
        }

        var world = await _context.Worlds
            .FirstOrDefaultAsync(m => m.WorldIDPK == worldidpk);
        if (world == null)
        {
            return NotFound();
        }

        return View(world);
    }

    // GET: WORLDS/Create
    public IActionResult Create()
    {
        return View();
    }

    // POST: WORLDS/Create
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create([Bind("WorldIDPK,WorldName,WorldDesc,WorldGenFK,WorldIsPublic,WorldUserFK,WorldCreatedAt,WorldUpdatedAt,WorldLikes,Categories,Pictures,Tags,WorldGenFKNavigation,WorldUserFKNavigation,WorldLikUserFKs")] World world)
    {
        if (ModelState.IsValid)
        {
            _context.Add(world);
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }
        return View(world);
    }

    // GET: WORLDS/Edit/5
    public async Task<IActionResult> Edit(int? worldidpk)
    {
        if (worldidpk == null)
        {
            return NotFound();
        }

        var world = await _context.Worlds.FindAsync(worldidpk);
        if (world == null)
        {
            return NotFound();
        }
        return View(world);
    }

    // POST: WORLDS/Edit/5
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int? worldidpk, [Bind("WorldIDPK,WorldName,WorldDesc,WorldGenFK,WorldIsPublic,WorldUserFK,WorldCreatedAt,WorldUpdatedAt,WorldLikes,Categories,Pictures,Tags,WorldGenFKNavigation,WorldUserFKNavigation,WorldLikUserFKs")] World world)
    {
        if (worldidpk != world.WorldIDPK)
        {
            return NotFound();
        }

        if (ModelState.IsValid)
        {
            try
            {
                _context.Update(world);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!WorldExists(world.WorldIDPK))
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
        return View(world);
    }

    // GET: WORLDS/Delete/5
    public async Task<IActionResult> Delete(int? worldidpk)
    {
        if (worldidpk == null)
        {
            return NotFound();
        }

        var world = await _context.Worlds
            .FirstOrDefaultAsync(m => m.WorldIDPK == worldidpk);
        if (world == null)
        {
            return NotFound();
        }

        return View(world);
    }

    // POST: WORLDS/Delete/5
    [HttpPost, ActionName("Delete")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteConfirmed(int? worldidpk)
    {
        var world = await _context.Worlds.FindAsync(worldidpk);
        if (world != null)
        {
            _context.Worlds.Remove(world);
        }

        await _context.SaveChangesAsync();
        return RedirectToAction(nameof(Index));
    }

    private bool WorldExists(int? worldidpk)
    {
        return _context.Worlds.Any(e => e.WorldIDPK == worldidpk);
    }
}
