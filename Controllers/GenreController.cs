using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldBuilder.Models;

public class GenreController : Controller
{
    private readonly WorldBuilderDBContext _context;

    public GenreController(WorldBuilderDBContext context)
    {
        _context = context;
    }

    // GET: GENRES
    public async Task<IActionResult> Index()
    {
        return View(await _context.Genres.ToListAsync());
    }

    // GET: GENRES/Details/5
    public async Task<IActionResult> Details(string? genrename)
    {
        if (genrename == null)
        {
            return NotFound();
        }

        var genre = await _context.Genres
            .FirstOrDefaultAsync(m => m.GenreName == genrename);
        if (genre == null)
        {
            return NotFound();
        }

        return View(genre);
    }

    // GET: GENRES/Create
    public IActionResult Create()
    {
        return View();
    }

    // POST: GENRES/Create
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create([Bind("GenreName,GenreDescription,Worlds")] Genre genre)
    {
        if (ModelState.IsValid)
        {
            _context.Add(genre);
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }
        return View(genre);
    }

    // GET: GENRES/Edit/5
    public async Task<IActionResult> Edit(string? genrename)
    {
        if (genrename == null)
        {
            return NotFound();
        }

        var genre = await _context.Genres.FindAsync(genrename);
        if (genre == null)
        {
            return NotFound();
        }
        return View(genre);
    }

    // POST: GENRES/Edit/5
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(string? genrename, [Bind("GenreName,GenreDescription,Worlds")] Genre genre)
    {
        if (genrename != genre.GenreName)
        {
            return NotFound();
        }

        if (ModelState.IsValid)
        {
            try
            {
                _context.Update(genre);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!GenreExists(genre.GenreName))
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
        return View(genre);
    }

    // GET: GENRES/Delete/5
    public async Task<IActionResult> Delete(string? genrename)
    {
        if (genrename == null)
        {
            return NotFound();
        }

        var genre = await _context.Genres
            .FirstOrDefaultAsync(m => m.GenreName == genrename);
        if (genre == null)
        {
            return NotFound();
        }

        return View(genre);
    }

    // POST: GENRES/Delete/5
    [HttpPost, ActionName("Delete")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteConfirmed(string? genrename)
    {
        var genre = await _context.Genres.FindAsync(genrename);
        if (genre != null)
        {
            _context.Genres.Remove(genre);
        }

        await _context.SaveChangesAsync();
        return RedirectToAction(nameof(Index));
    }

    private bool GenreExists(string? genrename)
    {
        return _context.Genres.Any(e => e.GenreName == genrename);
    }
}