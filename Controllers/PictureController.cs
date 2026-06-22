using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldBuilder.Models;

public class PictureController : Controller
{
    private readonly WorldBuilderDBContext _context;
    private readonly IWebHostEnvironment _env;

    public PictureController(WorldBuilderDBContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    // POST: /Picture/UploadAjax  (multipart form -> token comes as a form field)
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UploadAjax(IFormFile file, int worldId, string caption)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file." });

        var allowed = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowed.Contains(ext))
            return BadRequest(new { error = "Unsupported file type." });
        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { error = "File too large (max 5 MB)." });

        var dir = Path.Combine(_env.WebRootPath, "uploads", "pictures");
        Directory.CreateDirectory(dir);

        var fileName = $"{Guid.NewGuid():N}{ext}";
        await using (var stream = System.IO.File.Create(Path.Combine(dir, fileName)))
            await file.CopyToAsync(stream);

        var picture = new Picture
        {
            PicPath = $"/uploads/pictures/{fileName}",
            PicCaption = caption,
            PicWorldFK = worldId
        };
        _context.Pictures.Add(picture);
        await _context.SaveChangesAsync();

        return Json(new { id = picture.PicIDPK, path = picture.PicPath, caption = picture.PicCaption ?? "" });
    }

    public class CaptionDto { public int Id { get; set; } public string Caption { get; set; } }

    // POST: /Picture/UpdateCaptionAjax  (JSON body -> token via header)
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UpdateCaptionAjax([FromBody] CaptionDto dto)
    {
        var pic = await _context.Pictures.FindAsync(dto.Id);
        if (pic == null) return NotFound();
        pic.PicCaption = dto.Caption;
        await _context.SaveChangesAsync();
        return Ok();
    }

    public class IdDto { public int Id { get; set; } }

    // POST: /Picture/DeleteAjax
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteAjax([FromBody] IdDto dto)
    {
        var pic = await _context.Pictures.FindAsync(dto.Id);
        if (pic == null) return NotFound();

        if (!string.IsNullOrEmpty(pic.PicPath))
        {
            var full = Path.Combine(_env.WebRootPath,
                pic.PicPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (System.IO.File.Exists(full)) System.IO.File.Delete(full);
        }

        _context.Pictures.Remove(pic);
        await _context.SaveChangesAsync();
        return Ok();
    }
}