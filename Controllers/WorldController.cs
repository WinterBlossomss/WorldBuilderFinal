
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using WorldBuilder.Models;

public class WorldController : Controller
{
    private readonly WorldBuilderDBContext _context;
    private readonly UserManager<IdentityUser> _userManager;


    public WorldController(UserManager<IdentityUser> userManager, WorldBuilderDBContext context)
    {
        _context = context;
        _userManager = userManager;
    }

    // GET: WORLDS
    public async Task<IActionResult> Index()    
    {
        var worlds = await _context.Worlds
            .Include(w => w.WorldGenFKNavigation)
            .ToListAsync();
        ViewData["Genres"] = _context.Genres
                .Select(g => g.GenreName)
                .ToList();
        return View(worlds);
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
    [Authorize]
    public IActionResult Create()
    {
        ViewData["WorldGenFK"] = new SelectList(_context.Genres, "GenreName", "GenreName");
        return View();
    }

    // POST: WORLDS/Create
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create([Bind("WorldName,WorldDesc,WorldGenFK,WorldIsPublic,WorldCreatedAt,UploadedPicture")] World world)
    {
        if (ModelState.IsValid)
        {
            string id = _userManager.GetUserId(User);
            var user = await _context.UserInfos
            .FirstOrDefaultAsync(m => m.UserInfoUserIDFK == id);
            world.WorldUserFK = user.UserInfoIDPK;
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
