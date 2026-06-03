
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
    public async Task<IActionResult> Index(string q, string genre, string sort)
    {
        // Public worlds only — this is the public browser.
        // (Remove the WorldIsPublic line if you also want private worlds listed here.)
        var query = _context.Worlds
            .Include(w => w.WorldGenFKNavigation)
            .Include(w => w.WorldUserFKNavigation)
            .Include(w => w.Categories)
            .Where(w => w.WorldIsPublic)
            .AsQueryable();

        // Full unfiltered count, for the "X of Y match" subtitle.
        var totalAll = await query.CountAsync();

        // Genre filter
        if (!string.IsNullOrWhiteSpace(genre))
        {
            query = query.Where(w => w.WorldGenFK == genre);
        }

        // Search across title, description, genre, and creator handle
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(w =>
                w.WorldName.Contains(term) ||
                (w.WorldDesc != null && w.WorldDesc.Contains(term)) ||
                w.WorldGenFK.Contains(term) ||
                (w.WorldUserFKNavigation != null &&
                 w.WorldUserFKNavigation.UserInfoProN != null &&
                 w.WorldUserFKNavigation.UserInfoProN.Contains(term)));
        }

        // Sort
        query = sort switch
        {
            "newest" => query.OrderByDescending(w => w.WorldCreatedAt),
            "name" => query.OrderBy(w => w.WorldName),
            _ => query.OrderByDescending(w => w.WorldLikes ?? 0), // "loved" (default)
        };

        var worlds = await query.ToListAsync();

        ViewData["Genres"] = _context.Genres.Select(g => g.GenreName).ToList();
        ViewData["Pictures"] = _context.Pictures.ToList();

        // Echo the active filter state back to the view
        ViewData["Query"] = q;
        ViewData["Genre"] = genre;
        ViewData["Sort"] = sort;
        ViewData["TotalAll"] = totalAll;

        return View(worlds);
    }

    // GET: WORLDS/Details/5
    public async Task<IActionResult> Details(int? id)
    {
        if (id == null)
        {
            return NotFound();
        }
        ViewData["Pictures"] = _context.Pictures.ToList();

        var world = await _context.Worlds
            .Include(w => w.WorldGenFKNavigation)
            .Include(w => w.WorldUserFKNavigation)
            .Include(w => w.Categories)
            .Include(w => w.Pictures)
            .FirstOrDefaultAsync(m => m.WorldIDPK == id);

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


            if(world.UploadedPicture != null)
            {
                string[] fileParts = world.UploadedPicture.FileName.Split('.');
                if (fileParts.Length != 2)
                {
                    return View(world);
                }

                string newName = Math.Abs(Guid.NewGuid().GetHashCode()).ToString() + "." + fileParts[1];

                var newPic = new Picture
                {
                    PicPath = "Images/" + newName,
                };

                string wwwroot = Path.Combine(Path.GetFullPath("wwwroot"), "Images", newName);

                using (var stream = new FileStream(wwwroot, FileMode.Create, FileAccess.Write))
                {
                    await world.UploadedPicture.CopyToAsync(stream);
                }

                world.Pictures.Add(newPic);
            }


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
