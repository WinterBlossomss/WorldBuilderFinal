
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldBuilder.Models;

public class ConnectionController : Controller
{
    private readonly WorldBuilderDBContext _context;
    private readonly UserManager<IdentityUser> _userManager;

    public ConnectionController(WorldBuilderDBContext context, UserManager<IdentityUser> userManager)
    {
        _context = context;
        _userManager = userManager;

    }

    private async Task<int?> CurrentUserInfoIdAsync()
    {
        var uid = _userManager.GetUserId(User);
        if (uid == null) return null;
        var me = await _context.UserInfos.FirstOrDefaultAsync(u => u.UserInfoUserIDFK == uid);
        return me?.UserInfoIDPK;
    }

    // GET /Connection/TypesAjax  — relation types this user has defined
    [HttpGet]
    public async Task<IActionResult> TypesAjax()
    {
        var myId = await CurrentUserInfoIdAsync();
        var types = await _context.ConnectionTables
            .Where(c => c.ConnUserFK == myId)
            .OrderBy(c => c.ConnDescr)
            .Select(c => new { id = c.ConnIDPK, descr = c.ConnDescr })
            .ToListAsync();
        return Json(types);
    }

    public class CreateTypeDto { public string Descr { get; set; } }

    // POST /Connection/CreateTypeAjax
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CreateTypeAjax([FromBody] CreateTypeDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto?.Descr)) return BadRequest(new { error = "Required" });
        var myId = await CurrentUserInfoIdAsync();
        if (myId == null) return Unauthorized();

        var t = new ConnectionTable { ConnDescr = dto.Descr.Trim(), ConnUserFK = myId.Value };
        _context.ConnectionTables.Add(t);
        await _context.SaveChangesAsync();
        return Json(new { id = t.ConnIDPK, descr = t.ConnDescr });
    }

    //private bool ConnectionTableExists(int? connidpk)
    //{
    //    return _context.ConnectionTables.Any(e => e.ConnIDPK == connidpk);
    //}
}
