namespace WorldBuilder.Models
{
    public class WorldTocNode
    {
        public int CatId { get; set; }
        public string CatName { get; set; }
        public string CatColor { get; set; }
        public int Count { get; set; }
        public List<WorldTocSub> Subs { get; set; } = new();
    }

    public class WorldTocSub
    {
        public int SubId { get; set; }
        public string SubName { get; set; }
        public int Count { get; set; }
    }

    public class ScriptReadVM
    {
        public Script Script { get; set; }
        public World World { get; set; }

        public string CatName { get; set; }
        public int? CatId { get; set; }
        public string SubName { get; set; }
        public int? SubId { get; set; }

        public string AuthorHandle { get; set; }

        public List<Tag> Tags { get; set; } = new();
        public List<Picture> Pictures { get; set; } = new();
        public bool InfoEnabled { get; set; }
        public string InfoTitle { get; set; }
        public string PortraitPath { get; set; }
        public List<InfoRow> InfoRows { get; set; } = new();

        public List<LinkGroup> Links { get; set; } = new();

        public class InfoRow
        {
            public string Name { get; set; }
            public string Content { get; set; }
            public bool IsSection { get; set; }
        }

        public class LinkGroup
        {
            public string Label { get; set; }
            public List<LinkedScript> Items { get; set; } = new();
        }

        public class LinkedScript
        {
            public int Id { get; set; }
            public string Title { get; set; }
            public string CatName { get; set; }
        }
    }

    public class WorldReadVM
    {
        public World World { get; set; }
        public string AuthorHandle { get; set; }

        public bool IsOwner { get; set; }
        public bool HasLiked { get; set; }

        public int TotalScripts { get; set; }
        public int TotalCharacters { get; set; }
        public int TotalCategories => Contents.Count;

        public List<WorldTocNode> Contents { get; set; } = new();
    }
    public class WorldCategoryVM
    {
        public World World { get; set; }
        public string AuthorHandle { get; set; }

        public bool IsOwner { get; set; }

        public Category Current { get; set; }
        public List<Category> Siblings { get; set; } = new();
        public int TotalWorldScripts { get; set; }

        public List<WorldTocNode> Contents { get; set; } = new();
        public List<Card> Cards { get; set; } = new();

        public class Card
        {
            public int Id { get; set; }
            public string Title { get; set; }
            public string SubName { get; set; }
            public bool IsChar { get; set; }
            public string Excerpt { get; set; }
            public int Connections { get; set; }
            public string Portrait { get; set; }
        }
    }
}