using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldBuilder.Models;

public class DetailController : Controller
{
    private readonly WorldBuilderDBContext _context;

    public DetailController(WorldBuilderDBContext context) => _context = context;

    private const string HeaderName = "__HEADER__";

    // GET /Detail/ForScript?scriptId=5
    [HttpGet]
    public async Task<IActionResult> ForScript(int scriptId)
    {
        var rows = await _context.DetailViews
            .Where(dv => dv.DVScriptFK == scriptId)
            .Select(dv => new
            {
                attId = dv.DVAttFK,
                name = dv.DVAttFKNavigation.AttName,
                content = dv.DVAttFKNavigation.AttContent,
                isSection = dv.DVAttFKNavigation.AttIsSection ?? false,
                order = dv.DVAttFKNavigation.AttOrder,
                title = dv.DVTitle,        // only meaningful on the header row
                picId = dv.DVPicFK,
                picPath = dv.DVPicFKNavigation.PicPath
            })
            .OrderBy(r => r.order)
            .ToListAsync();

        var header = rows.FirstOrDefault(r => r.name == HeaderName);
        var body = rows.Where(r => r.name != HeaderName)
                         .Select(r => new { r.name, r.content, r.isSection })
                         .ToList();

        return Json(new
        {
            title = header?.title ?? "",
            picId = header?.picId,
            picPath = header?.picPath,
            enabled = header?.isSection ?? true,   // header's AttIsSection = enabled flag
            rows = body
        });
    }

    public class DetailRowDto
    {
        public string Name { get; set; }
        public string Content { get; set; }
        public bool IsSection { get; set; }
    }

    public class SaveDetailDto
    {
        public int ScriptId { get; set; }
        public string Title { get; set; }
        public int? PicId { get; set; }
        public bool Enabled { get; set; } = true;   // ← add
        public List<DetailRowDto> Rows { get; set; } = new();
    }

    // POST /Detail/SaveAjax  — replace-all for this script's infobox
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> SaveAjax([FromBody] SaveDetailDto dto)
    {
        // 1) delete existing DetailViews + their Attributes for this script
        var existing = await _context.DetailViews
            .Where(dv => dv.DVScriptFK == dto.ScriptId)
            .Include(dv => dv.DVAttFKNavigation)
            .ToListAsync();

        var oldAtts = existing.Select(dv => dv.DVAttFKNavigation).Where(a => a != null).ToList();
        _context.DetailViews.RemoveRange(existing);
        _context.Attributes.RemoveRange(oldAtts);
        await _context.SaveChangesAsync();   // clear first so PKs are free

        int order = 0;

        // 2) header row carries the box title + portrait
        var headerAtt = new WorldBuilder.Models.Attribute
        {
            AttName = HeaderName,
            AttContent = null,
            AttIsSection = dto.Enabled,   // ← was null; now the enabled flag
            AttOrder = order++
        };

        _context.Attributes.Add(headerAtt);
        await _context.SaveChangesAsync();   // need its PK

        _context.DetailViews.Add(new DetailView
        {
            DVAttFK = headerAtt.AttIDPK,
            DVScriptFK = dto.ScriptId,
            DVTitle = dto.Title,
            DVPicFK = dto.PicId
        });

        // 3) body rows (sections + fields), preserving array order
        foreach (var r in dto.Rows)
        {
            if (string.IsNullOrWhiteSpace(r.Name) && string.IsNullOrWhiteSpace(r.Content)) continue;

            var att = new WorldBuilder.Models.Attribute
            {
                AttName = r.Name,
                AttContent = r.IsSection ? null : r.Content,
                AttIsSection = r.IsSection,
                AttOrder = order++
            };
            _context.Attributes.Add(att);
            await _context.SaveChangesAsync();   // need PK for the composite key

            _context.DetailViews.Add(new DetailView
            {
                DVAttFK = att.AttIDPK,
                DVScriptFK = dto.ScriptId
            });
        }

        await _context.SaveChangesAsync();
        return Ok();
    }
}