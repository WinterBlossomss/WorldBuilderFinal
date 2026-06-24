using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldBuilder.Models;

public class RelationController : Controller
{
    private readonly WorldBuilderDBContext _context;
    public RelationController(WorldBuilderDBContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> ForScript(int scriptId)
    {
        var links = await _context.ScriptScripts
            .Where(ss => ss.ScriptScriptOneFK == scriptId || ss.ScriptScriptTwoFK == scriptId)
            .Select(ss => new
            {
                oneId = ss.ScriptScriptOneFK,
                twoId = ss.ScriptScriptTwoFK,
                connId = ss.ScriptScriptConnFK,
                connDescr = ss.ScriptScriptConnFKNavigation.ConnDescr,
                otherId = ss.ScriptScriptOneFK == scriptId ? ss.ScriptScriptTwoFK : ss.ScriptScriptOneFK,
                otherTitle = ss.ScriptScriptOneFK == scriptId
                    ? ss.ScriptScriptTwoFKNavigation.ScriptTitle
                    : ss.ScriptScriptOneFKNavigation.ScriptTitle
            })
            .ToListAsync();
        return Json(links);
    }

    [HttpGet]
    public async Task<IActionResult> SearchScripts(string q, int excludeId)
    {
        var query = _context.Scripts.Where(s => s.ScriptIDPK != excludeId);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(s => EF.Functions.Like(s.ScriptTitle, "%" + term + "%"));
        }
        var results = await query
            .OrderBy(s => s.ScriptTitle).Take(10)
            .Select(s => new { id = s.ScriptIDPK, title = s.ScriptTitle })
            .ToListAsync();
        return Json(results);
    }

    public class LinkDto 
    { 
        public int FromId { get; set; } 
        public int ToId { get; set; } 
        public int ConnId { get; set; } 
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> LinkAjax([FromBody] LinkDto dto)
    {
        if (dto.FromId == dto.ToId) return BadRequest(new { error = "Can't link a script to itself." });

        bool exists = await _context.ScriptScripts.AnyAsync(ss =>
            (ss.ScriptScriptOneFK == dto.FromId && ss.ScriptScriptTwoFK == dto.ToId) ||
            (ss.ScriptScriptOneFK == dto.ToId && ss.ScriptScriptTwoFK == dto.FromId));
        if (exists) return BadRequest(new { error = "These scripts are already linked." });

        _context.ScriptScripts.Add(new ScriptScript
        {
            ScriptScriptOneFK = dto.FromId,
            ScriptScriptTwoFK = dto.ToId,
            ScriptScriptConnFK = dto.ConnId
        });
        await _context.SaveChangesAsync();

        var descr = await _context.ConnectionTables.Where(c => c.ConnIDPK == dto.ConnId)
            .Select(c => c.ConnDescr).FirstOrDefaultAsync();
        var title = await _context.Scripts.Where(s => s.ScriptIDPK == dto.ToId)
            .Select(s => s.ScriptTitle).FirstOrDefaultAsync();

        return Json(new
        {
            oneId = dto.FromId,
            twoId = dto.ToId,
            connId = dto.ConnId,
            connDescr = descr,
            otherId = dto.ToId,
            otherTitle = title
        });
    }

    public class UnlinkDto 
    { 
        public int OneId { get; set; } 
        public int TwoId { get; set; } 
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UnlinkAjax([FromBody] UnlinkDto dto)
    {
        var link = await _context.ScriptScripts.FirstOrDefaultAsync(ss =>
            (ss.ScriptScriptOneFK == dto.OneId && ss.ScriptScriptTwoFK == dto.TwoId) ||
            (ss.ScriptScriptOneFK == dto.TwoId && ss.ScriptScriptTwoFK == dto.OneId));
        if (link == null) return NotFound();
        _context.ScriptScripts.Remove(link);
        await _context.SaveChangesAsync();
        return Ok();
    }
}