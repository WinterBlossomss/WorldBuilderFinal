
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldBuilder.Models;

public class ConnectionController : Controller
{
    private readonly WorldBuilderDBContext _context;

    public ConnectionController(WorldBuilderDBContext context)
    {
        _context = context;
    }

    // GET: CONNECTIONTABLES
    public async Task<IActionResult> Index()    
    {
        return View(await _context.ConnectionTables.ToListAsync());
    }

    // GET: CONNECTIONTABLES/Details/5
    public async Task<IActionResult> Details(int? connidpk)
    {
        if (connidpk == null)
        {
            return NotFound();
        }

        var connectiontable = await _context.ConnectionTables
            .FirstOrDefaultAsync(m => m.ConnIDPK == connidpk);
        if (connectiontable == null)
        {
            return NotFound();
        }

        return View(connectiontable);
    }

    // GET: CONNECTIONTABLES/Create
    public IActionResult Create()
    {
        return View();
    }

    // POST: CONNECTIONTABLES/Create
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create([Bind("ConnIDPK,ConnDescr,ConnUserFK,ScriptScripts")] ConnectionTable connectiontable)
    {
        if (ModelState.IsValid)
        {
            _context.Add(connectiontable);
            await _context.SaveChangesAsync();
            return RedirectToAction(nameof(Index));
        }
        return View(connectiontable);
    }

    // GET: CONNECTIONTABLES/Edit/5
    public async Task<IActionResult> Edit(int? connidpk)
    {
        if (connidpk == null)
        {
            return NotFound();
        }

        var connectiontable = await _context.ConnectionTables.FindAsync(connidpk);
        if (connectiontable == null)
        {
            return NotFound();
        }
        return View(connectiontable);
    }

    // POST: CONNECTIONTABLES/Edit/5
    // To protect from overposting attacks, enable the specific properties you want to bind to.
    // For more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int? connidpk, [Bind("ConnIDPK,ConnDescr,ConnUserFK,ScriptScripts")] ConnectionTable connectiontable)
    {
        if (connidpk != connectiontable.ConnIDPK)
        {
            return NotFound();
        }

        if (ModelState.IsValid)
        {
            try
            {
                _context.Update(connectiontable);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ConnectionTableExists(connectiontable.ConnIDPK))
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
        return View(connectiontable);
    }

    // GET: CONNECTIONTABLES/Delete/5
    public async Task<IActionResult> Delete(int? connidpk)
    {
        if (connidpk == null)
        {
            return NotFound();
        }

        var connectiontable = await _context.ConnectionTables
            .FirstOrDefaultAsync(m => m.ConnIDPK == connidpk);
        if (connectiontable == null)
        {
            return NotFound();
        }

        return View(connectiontable);
    }

    // POST: CONNECTIONTABLES/Delete/5
    [HttpPost, ActionName("Delete")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteConfirmed(int? connidpk)
    {
        var connectiontable = await _context.ConnectionTables.FindAsync(connidpk);
        if (connectiontable != null)
        {
            _context.ConnectionTables.Remove(connectiontable);
        }

        await _context.SaveChangesAsync();
        return RedirectToAction(nameof(Index));
    }

    private bool ConnectionTableExists(int? connidpk)
    {
        return _context.ConnectionTables.Any(e => e.ConnIDPK == connidpk);
    }
}
