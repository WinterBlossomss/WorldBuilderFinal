using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldBuilder.Models;

public class TagController : Controller
{
    private readonly WorldBuilderDBContext _context;
    private readonly UserManager<IdentityUser> _userManager;

    public TagController(WorldBuilderDBContext context, UserManager<IdentityUser> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    // domain user id (UserInfo PK) for the logged-in identity user
    private async Task<int?> CurrentUserInfoIdAsync()
    {
        var uid = _userManager.GetUserId(User);
        if (uid == null) return null;
        var me = await _context.UserInfos
            .FirstOrDefaultAsync(u => u.UserInfoUserIDFK == uid);
        return me?.UserInfoIDPK;
    }

    // GET: /Tag/List?worldId=5&q=re
    [HttpGet]
    public async Task<IActionResult> List(int worldId, string q = null)
    {
        var myId = await CurrentUserInfoIdAsync();

        // tags usable here = this world's tags + my "all-worlds" tags
        var baseQuery = _context.Tags
            .Where(t => t.TagWorldFK == worldId
                     || (myId != null && t.TagUserFK == myId));

        var total = await baseQuery.CountAsync();

        var filtered = baseQuery;
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            filtered = filtered.Where(t => EF.Functions.Like(t.TagName, term + "%"));
        }

        var tags = await filtered
            .OrderBy(t => t.TagName)
            .Select(t => new
            {
                id = t.TagIDPK,
                name = t.TagName,
                color = t.TagColor,
                allWorlds = t.TagUserFK != null,
                count = t.ScriptTagScriptFKs.Count
            })
            .ToListAsync();

        return Json(new { total, matched = tags.Count, tags });
    }

    

    // POST: /Tag/CreateAjax
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CreateAjax([FromBody] CreateTagDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto?.Name))
            return BadRequest(new { error = "Name is required." });

        var myId = await CurrentUserInfoIdAsync();
        if (myId == null) return Unauthorized();

        var tag = new Tag
        {
            TagName = dto.Name.Trim(),
            TagColor = dto.Color,
            // all-worlds => owned by user, not pinned to a world; otherwise world-scoped
            TagWorldFK = dto.AllWorlds ? (int?)null : dto.WorldId,
            TagUserFK = dto.AllWorlds ? myId : (int?)null
        };

        _context.Tags.Add(tag);
        await _context.SaveChangesAsync();

        return Json(new
        {
            id = tag.TagIDPK,
            name = tag.TagName,
            color = tag.TagColor,
            allWorlds = tag.TagUserFK != null,
            count = 0
        });
    }
}

public class CreateTagDto
{
    public string Name { get; set; }
    public string Color { get; set; }
    public bool AllWorlds { get; set; }
    public int WorldId { get; set; }
}