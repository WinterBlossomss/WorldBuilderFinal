using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
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

    private async Task<WorldBuilder.Models.UserInfo> CurrentUserInfoAsync()
    {
        if (User?.Identity?.IsAuthenticated != true) return null;
        var uid = _userManager.GetUserId(User);
        return await _context.UserInfos.FirstOrDefaultAsync(u => u.UserInfoUserIDFK == uid);
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

        var world = await _context.Worlds
            .Include(w => w.WorldGenFKNavigation)
            .Include(w => w.WorldUserFKNavigation)
            .Include(w => w.Pictures)
            .Include(w => w.Tags)
            .Include(w => w.Categories).ThenInclude(c => c.SubCategories)
            .Include(w => w.Categories).ThenInclude(c => c.Pictures)
            .FirstOrDefaultAsync(m => m.WorldIDPK == id);

        if (world == null)
        {
            return NotFound();
        }

        // Is the current viewer the owner of this world?
        bool isOwner = false;
        if (User?.Identity?.IsAuthenticated == true)
        {
            var uid = _userManager.GetUserId(User);
            var me = await _context.UserInfos
                .FirstOrDefaultAsync(u => u.UserInfoUserIDFK == uid);
            isOwner = me != null && me.UserInfoIDPK == world.WorldUserFK;
        }
        ViewData["IsOwner"] = isOwner;

        bool hasLiked = false;
        var meInfo = await CurrentUserInfoAsync();
        if (meInfo != null)
        {
            hasLiked = await _context.Worlds
                .Where(w => w.WorldIDPK == world.WorldIDPK)
                .SelectMany(w => w.WorldLikUserFKs)
                .AnyAsync(u => u.UserInfoIDPK == meInfo.UserInfoIDPK);
        }
        ViewData["HasLiked"] = hasLiked;

        // Other public worlds by the same creator (excluding this one)
        ViewData["MoreByAuthor"] = await _context.Worlds
            .Where(w => w.WorldUserFK == world.WorldUserFK
                     && w.WorldIDPK != world.WorldIDPK
                     && w.WorldIsPublic)
            .OrderByDescending(w => w.WorldLikes ?? 0)
            .Take(5)
            .ToListAsync();

        // More public worlds in the same genre (excluding this one) — bottom carousel
        ViewData["MoreInGenre"] = await _context.Worlds
            .Include(w => w.WorldUserFKNavigation)
            .Include(w => w.Categories)
            .Where(w => w.WorldGenFK == world.WorldGenFK
                     && w.WorldIDPK != world.WorldIDPK
                     && w.WorldIsPublic)
            .OrderByDescending(w => w.WorldLikes ?? 0)
            .Take(10)
            .ToListAsync();

        ViewData["GenreCount"] = await _context.Worlds
            .CountAsync(w => w.WorldGenFK == world.WorldGenFK && w.WorldIsPublic);

        // Needed by the _WorldCard partial used in the bottom carousel
        ViewData["Pictures"] = await _context.Pictures.ToListAsync();

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

            if (world.UploadedPicture != null)
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
    public async Task<IActionResult> Edit(int? id)
    {
        if (id == null)
        {
            return NotFound();
        }

        var world = await _context.Worlds
            .Include(w => w.Pictures)
            .FirstOrDefaultAsync(w => w.WorldIDPK == id);

        if (world == null)
        {
            return NotFound();
        }

        ViewData["WorldGenFK"] = new SelectList(_context.Genres, "GenreName", "GenreName", world.WorldGenFK);

        return View(world);
    }

    // POST: WORLDS/Edit/5
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id,
        [Bind("WorldIDPK,WorldName,WorldDesc,WorldGenFK,WorldIsPublic")] World input, IFormFile? UploadedPicture,
        bool RemoveCover)
    {
        if (id != input.WorldIDPK)
        {
            return NotFound();
        }

        var world = await _context.Worlds
            .Include(w => w.Pictures)
            .FirstOrDefaultAsync(w => w.WorldIDPK == id);

        if (world == null)
        {
            return NotFound();
        }

        if (!ModelState.IsValid)
        {
            world.WorldName = input.WorldName;
            world.WorldDesc = input.WorldDesc;
            world.WorldGenFK = input.WorldGenFK;
            world.WorldIsPublic = input.WorldIsPublic;
            ViewData["WorldGenFK"] = new SelectList(_context.Genres, "GenreName", "GenreName", input.WorldGenFK);
            return View(world);
        }

        world.WorldName = input.WorldName;
        world.WorldDesc = input.WorldDesc;
        world.WorldGenFK = input.WorldGenFK;
        world.WorldIsPublic = input.WorldIsPublic;
        world.WorldUpdatedAt = DateTime.Today;

        var cover = world.Pictures.FirstOrDefault(p => p.PicWorldFK == world.WorldIDPK);

        if (UploadedPicture != null)
        {
            string[] fileParts = input.UploadedPicture.FileName.Split('.');
            if (fileParts.Length == 2)
            {
                string newName = Math.Abs(Guid.NewGuid().GetHashCode()).ToString() + "." + fileParts[1];
                string wwwroot = Path.Combine(Path.GetFullPath("wwwroot"), "Images", newName);

                using (var stream = new FileStream(wwwroot, FileMode.Create, FileAccess.Write))
                {
                    await input.UploadedPicture.CopyToAsync(stream);
                }

                if (cover != null)
                {
                    cover.PicPath = "Images/" + newName;
                }
                else
                {
                    world.Pictures.Add(new Picture { PicPath = "Images/" + newName, PicWorldFK = world.WorldIDPK });
                }
            }
        }
        else if (RemoveCover && cover != null)
        {
            _context.Pictures.Remove(cover);
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!WorldExists(world.WorldIDPK))
            {
                return NotFound();
            }
            throw;
        }

        return RedirectToAction("Index", "BuilderView", new { id = world.WorldIDPK });
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

    public async Task<IActionResult> Read(int? id)
    {
        if (id == null) return NotFound();

        var world = await _context.Worlds
            .Include(w => w.WorldUserFKNavigation)
            .Include(w => w.Pictures)
            .Include(w => w.Tags)
            .Include(w => w.Categories).ThenInclude(c => c.SubCategories)
            .FirstOrDefaultAsync(w => w.WorldIDPK == id);
        if (world == null) return NotFound();

        var catIds = world.Categories.Select(c => c.CatIDPK).ToList();

        var catCounts = (await _context.Scripts
            .Where(s => catIds.Contains(s.ScriptCatFK))
            .GroupBy(s => s.ScriptCatFK)
            .Select(g => new { CatId = g.Key, Count = g.Count() })
            .ToListAsync())
            .ToDictionary(x => x.CatId, x => x.Count);

        var me = await CurrentUserInfoAsync();

        ViewData["AuthorHandle"] = world.WorldUserFKNavigation?.UserInfoProN; // string
        ViewData["CatCounts"] = catCounts;                                 // Dictionary<int,int>
        ViewData["TotalScripts"] = catCounts.Values.Sum();                    // int
        ViewData["TotalCategories"] = world.Categories.Count;                    // int
        ViewData["TotalCharacters"] = await _context.Scripts
            .Where(s => catIds.Contains(s.ScriptCatFK) && s.ScriptIsChar).CountAsync();
        ViewData["IsOwner"] = me != null && me.UserInfoIDPK == world.WorldUserFK;
        ViewData["HasLiked"] = me != null && await _context.Worlds
            .Where(w => w.WorldIDPK == world.WorldIDPK)
            .SelectMany(w => w.WorldLikUserFKs)
            .AnyAsync(u => u.UserInfoIDPK == me.UserInfoIDPK);

        return View(world);
    }

    public async Task<IActionResult> Category(int id, int catId)
    {
        var world = await _context.Worlds
            .Include(w => w.WorldUserFKNavigation)
            .Include(w => w.Categories).ThenInclude(c => c.SubCategories)
            .FirstOrDefaultAsync(w => w.WorldIDPK == id);
        if (world == null) return NotFound();

        var current = world.Categories.FirstOrDefault(c => c.CatIDPK == catId);
        if (current == null) return NotFound();

        var scripts = await _context.Scripts
            .Include(s => s.PicScriptPicFKs)
            .Where(s => s.ScriptCatFK == catId)
            .OrderBy(s => s.ScriptTitle)
            .ToListAsync();

        var ids = scripts.Select(s => s.ScriptIDPK).ToList();
        var edges = await _context.ScriptScripts
            .Where(e => ids.Contains(e.ScriptScriptOneFK) || ids.Contains(e.ScriptScriptTwoFK))
            .ToListAsync();
        var connections = ids.ToDictionary(
            sid => sid,
            sid => edges.Count(e => e.ScriptScriptOneFK == sid || e.ScriptScriptTwoFK == sid));

        // per-category counts for the whole contents tree
        var allCatIds = world.Categories.Select(c => c.CatIDPK).ToList();
        var catCounts = (await _context.Scripts
            .Where(s => allCatIds.Contains(s.ScriptCatFK))
            .GroupBy(s => s.ScriptCatFK)
            .Select(g => new { CatId = g.Key, Count = g.Count() })
            .ToListAsync())
            .ToDictionary(x => x.CatId, x => x.Count);

        var me = await CurrentUserInfoAsync();

        ViewData["AuthorHandle"] = world.WorldUserFKNavigation?.UserInfoProN;                  // string
        ViewData["Current"] = current;                                                    // Category
        ViewData["CatScripts"] = scripts;                                                     // List<Script>
        ViewData["Connections"] = connections;                                                // Dictionary<int,int>
        ViewData["SubNames"] = current.SubCategories.ToDictionary(s => s.SubIDPK, s => s.SubName); // Dictionary<int,string>
        ViewData["CatCounts"] = catCounts;                                                   // Dictionary<int,int>
        ViewData["TotalWorldScripts"] = catCounts.Values.Sum();                                      // int
        ViewData["IsOwner"] = me != null && me.UserInfoIDPK == world.WorldUserFK;

        return View(world);
    }


    [HttpGet]
    public async Task<IActionResult> Search(int id, string q)
    {
        q = (q ?? "").Trim();
        if (q.Length < 1)
            return Json(new { categories = Array.Empty<object>(), scripts = Array.Empty<object>() });

        var ql = q.ToLower();

        // categories in this world
        var cats = await _context.Categories
            .Where(c => c.CatWorldFK == id)
            .Select(c => new { c.CatIDPK, c.CatName })
            .ToListAsync();

        var catIds = cats.Select(c => c.CatIDPK).ToList();
        var catNames = cats.ToDictionary(c => c.CatIDPK, c => c.CatName);

        // matching categories (cap a few)
        var categories = cats
            .Where(c => (c.CatName ?? "").ToLower().Contains(ql))
            .OrderBy(c => c.CatName)
            .Take(5)
            .Select(c => new { id = c.CatIDPK, name = c.CatName })
            .ToList();

        // matching scripts (entries/characters) by title, only within this world
        var hits = await _context.Scripts
            .Where(s => catIds.Contains(s.ScriptCatFK)
                     && s.ScriptTitle != null
                     && s.ScriptTitle.ToLower().Contains(ql))
            .OrderBy(s => s.ScriptTitle)
            .Take(8)
            .Select(s => new { s.ScriptIDPK, s.ScriptTitle, s.ScriptCatFK, s.ScriptIsChar })
            .ToListAsync();

        var scripts = hits.Select(s => new
        {
            id = s.ScriptIDPK,
            title = s.ScriptTitle,
            cat = catNames.TryGetValue(s.ScriptCatFK, out var cn) ? cn : null,
            isChar = s.ScriptIsChar
        });

        return Json(new { categories, scripts });
    }

    [HttpPost]
    [Microsoft.AspNetCore.Authorization.Authorize]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ToggleLike(int id)
    {
        var me = await CurrentUserInfoAsync();
        if (me == null) return Unauthorized();

        var world = await _context.Worlds
            .Include(w => w.WorldLikUserFKs)
            .FirstOrDefaultAsync(w => w.WorldIDPK == id);
        if (world == null) return NotFound();

        var existing = world.WorldLikUserFKs.FirstOrDefault(u => u.UserInfoIDPK == me.UserInfoIDPK);
        bool liked;
        if (existing != null)
        {
            world.WorldLikUserFKs.Remove(existing);
            liked = false;
        }
        else
        {
            var tracked = await _context.UserInfos.FindAsync(me.UserInfoIDPK);
            world.WorldLikUserFKs.Add(tracked);
            liked = true;
        }

        world.WorldLikes = world.WorldLikUserFKs.Count;
        await _context.SaveChangesAsync();

        return Json(new { liked, count = world.WorldLikes ?? 0 });
    }

    [HttpPost]
    [Microsoft.AspNetCore.Authorization.Authorize]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> RequestGenre(string GenreReqName, string GenreReqReason)
    {
        if (string.IsNullOrWhiteSpace(GenreReqName))
        {
            TempData["GenreReqError"] = "Please enter a genre name.";
            return RedirectToAction(nameof(Create));
        }

        var me = await CurrentUserInfoAsync();

        // Skip duplicates (already a genre, or already pending)
        bool exists = await _context.Genres.AnyAsync(g => g.GenreName == GenreReqName)
            || await _context.Set<WorldBuilder.Models.GenreRequest>()
                     .AnyAsync(r => r.GenreReqName == GenreReqName && r.GenreReqStatus == "pending");

        if (!exists)
        {
            _context.Add(new WorldBuilder.Models.GenreRequest
            {
                GenreReqName = GenreReqName.Trim(),
                GenreReqReason = GenreReqReason,
                GenreReqUserFK = me?.UserInfoIDPK,
                GenreReqStatus = "pending",
                GenreReqCreatedAt = DateTime.Today
            });
            await _context.SaveChangesAsync();
        }

        TempData["GenreReqSent"] = GenreReqName.Trim();
        return RedirectToAction(nameof(Create));
    }

    // GET: /World/Liked — worlds the signed-in user has liked (drawer "Liked worlds")
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> Liked(string sort)
    {
        var me = await CurrentUserInfoAsync();
        var worlds = new List<World>();
        if (me != null)
        {
            worlds = await _context.Worlds
                .Include(w => w.WorldGenFKNavigation)
                .Include(w => w.WorldUserFKNavigation)
                .Include(w => w.Categories)
                .Where(w => w.WorldLikUserFKs.Any(u => u.UserInfoIDPK == me.UserInfoIDPK))
                .OrderByDescending(w => w.WorldLikes ?? 0)
                .ToListAsync();
        }

        ViewData["Genres"] = _context.Genres.Select(g => g.GenreName).ToList();
        ViewData["Pictures"] = _context.Pictures.ToList();
        ViewData["Query"] = null; ViewData["Genre"] = null; ViewData["Sort"] = sort;
        ViewData["TotalAll"] = worlds.Count;
        ViewData["Title"] = "Liked worlds";
        // Reuses the existing Views/World/Index.cshtml grid
        return View("Index", worlds);
    }
    private bool WorldExists(int? worldidpk)
    {
        return _context.Worlds.Any(e => e.WorldIDPK == worldidpk);
    }
}