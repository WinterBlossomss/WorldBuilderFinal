using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorldBuilder.Models;

namespace WorldBuilder.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScriptAPIController : ControllerBase
    {
        private readonly WorldBuilderDBContext _context;

        public ScriptAPIController(WorldBuilderDBContext context)
        {
            _context = context;
        }

        // GET: api/ScriptAPI
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Script>>> GetScripts()
        {
            return await _context.Scripts
                .AsNoTracking()
                .ToListAsync();
        }

        // GET: api/ScriptAPI/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Script>> GetScript(int id)
        {
            var script = await _context.Scripts.FindAsync(id);

            if (script == null)
            {
                return NotFound();
            }

            return script;
        }

        // POST: api/ScriptAPI
        [HttpPost]
        public async Task<ActionResult<Script>> PostScript(Script script)
        {
            if (script == null)
                return BadRequest();

            // Server owns the timestamps — don't trust the client for these.
            script.ScriptCreateAt = System.DateTime.UtcNow;
            script.ScriptUpdateAt = null;

            _context.Scripts.Add(script);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetScript), new { id = script.ScriptIDPK }, script);
        }

        // PUT: api/ScriptAPI/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutScript(int id, Script script)
        {
            if (id != script.ScriptIDPK)
            {
                return BadRequest();
            }

            var existing = await _context.Scripts.FindAsync(id);
            if (existing == null)
            {
                return NotFound();
            }

            existing.ScriptTitle = script.ScriptTitle;
            existing.ScriptContent = script.ScriptContent;
            existing.ScriptCatFK = script.ScriptCatFK;
            existing.ScriptSubFK = script.ScriptSubFK;
            existing.ScriptIsPublic = script.ScriptIsPublic;
            existing.ScriptIsChar = script.ScriptIsChar;
            existing.ScriptBoardX = script.ScriptBoardX;
            existing.ScriptBoardY = script.ScriptBoardY;
            existing.ScriptBoardColor = script.ScriptBoardColor;

            existing.ScriptUpdateAt = System.DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/ScriptAPI/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteScript(int id)
        {
            var script = await _context.Scripts.FindAsync(id);
            if (script == null)
            {
                return NotFound();
            }

            _context.Scripts.Remove(script);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool ScriptExists(int id)
        {
            return _context.Scripts.Any(e => e.ScriptIDPK == id);
        }
    }
}