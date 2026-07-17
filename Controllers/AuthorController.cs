using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Reflection.Metadata;
using WorldBuilder.Models;

namespace WorldBuilder.Controllers
{
    public class AuthorController : Controller
    {
        private readonly WorldBuilderDBContext _context;
        private readonly UserManager<IdentityUser> _userManager;

        public AuthorController(WorldBuilderDBContext context, UserManager<IdentityUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        // GET: /Author/Index/5   or   /Author/Index?handle=runeforge
        public async Task<IActionResult> Index(int? id, string handle)
        {
            UserInfo user = null;

            if (id != null)
                user = await _context.UserInfos.FirstOrDefaultAsync(u => u.UserInfoIDPK == id);
            else if (!string.IsNullOrWhiteSpace(handle))
            {
                var h = handle.TrimStart('@');
                user = await _context.UserInfos.FirstOrDefaultAsync(u => u.UserInfoProN == h);
            }

            if (user == null) return NotFound();

            // Username lives on the Identity account, keyed by the profile's user id.
            var identityUser = await _userManager.FindByIdAsync(user.UserInfoUserIDFK);
            var username = identityUser?.UserName;

            // Public worlds by this builder (drafts/private excluded from the public profile)
            var worlds = await _context.Worlds
                .Include(w => w.WorldUserFKNavigation)
                .Include(w => w.Categories)
                .Include(w => w.Pictures)
                .Where(w => w.WorldUserFK == user.UserInfoIDPK && w.WorldIsPublic)
                .OrderByDescending(w => w.WorldLikes ?? 0)
                .ToListAsync();

            var worldIds = worlds.Select(w => w.WorldIDPK).ToList();

            var catIdToWorld = await _context.Categories
                .Where(c => c.CatWorldFK != null && worldIds.Contains(c.CatWorldFK.Value))
                .Select(c => new { c.CatIDPK, c.CatName, WorldId = c.CatWorldFK.Value })
                .ToListAsync();
            var catIds = catIdToWorld.Select(c => c.CatIDPK).ToList();

            var worldNames = worlds.ToDictionary(w => w.WorldIDPK, w => w.WorldName);

            // Featured characters = public character-scripts inside this builder's public worlds
            var chars = await _context.Scripts
                .Include(s => s.PicScriptPicFKs)
                .Where(s => s.ScriptIsChar && s.ScriptIsPublic && catIds.Contains(s.ScriptCatFK))
                .OrderByDescending(s => s.ScriptCreateAt)
                .Take(12)
                .ToListAsync();

            var characters = chars.Select(s =>
            {
                var meta = catIdToWorld.FirstOrDefault(c => c.CatIDPK == s.ScriptCatFK);
                return new CharacterCard
                {
                    ScriptId = s.ScriptIDPK,
                    Title = s.ScriptTitle,
                    WorldName = meta != null && worldNames.TryGetValue(meta.WorldId, out var wn) ? wn : null,
                    CategoryName = meta?.CatName,
                    PortraitPath = s.PicScriptPicFKs.FirstOrDefault()?.PicPath
                };
            }).ToList();

            var vm = new AuthorProfile
            {
                User = user,
                Username = username,
                Worlds = worlds,
                Characters = characters,
                TotalScripts = await _context.Scripts.CountAsync(s => catIds.Contains(s.ScriptCatFK)),
                TotalLikes = worlds.Sum(w => w.WorldLikes ?? 0)
            };

            ViewData["Pictures"] = await _context.Pictures.ToListAsync();
            ViewData["Title"] = "@" + (user.UserInfoProN ?? "builder");
            return View(vm);
        }

        // GET: /Author/Browse — directory of builders
        public async Task<IActionResult> Browse()
        {
            // Username lives on the Identity account — map user id -> username.
            var usernames = await _userManager.Users
                .Select(iu => new { iu.Id, iu.UserName })
                .ToDictionaryAsync(x => x.Id, x => x.UserName);

            var builders = await _context.UserInfos
                .Select(u => new
                {
                    u.UserInfoIDPK,
                    u.UserInfoUserIDFK,
                    u.UserInfoBio,
                    Worlds = _context.Worlds.Count(w => w.WorldUserFK == u.UserInfoIDPK && w.WorldIsPublic),
                    Likes = _context.Worlds.Where(w => w.WorldUserFK == u.UserInfoIDPK).Sum(w => (int?)w.WorldLikes) ?? 0
                })
                .OrderByDescending(b => b.Worlds)
                .ToListAsync();

            var rows = builders.Select(b => new BuilderRow
            {
                UserInfoId = b.UserInfoIDPK,
                Username = usernames.TryGetValue(b.UserInfoUserIDFK, out var name) ? name : null,
                Bio = b.UserInfoBio,
                Worlds = b.Worlds,
                Likes = b.Likes
            }).ToList();

            ViewData["Title"] = "Community";
            return View(rows);
        }
    }

    public class AuthorProfile
    {
        public UserInfo User { get; set; }
        public string Username { get; set; }
        public List<World> Worlds { get; set; } = new();
        public List<CharacterCard> Characters { get; set; } = new();
        public int TotalScripts { get; set; }
        public int TotalLikes { get; set; }
    }

    public class CharacterCard
    {
        public int ScriptId { get; set; }
        public string Title { get; set; }
        public string WorldName { get; set; }
        public string CategoryName { get; set; }
        public string PortraitPath { get; set; }
    }

    public class BuilderRow
    {
        public int UserInfoId { get; set; }
        public string Username { get; set; }   
        public string Bio { get; set; }
        public int Worlds { get; set; }
        public int Likes { get; set; }
    }
}
