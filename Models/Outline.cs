using System.ComponentModel.DataAnnotations.Schema;

namespace WorldBuilder.Models
{
    [NotMapped]
    public class OutlineVM
    {
        public World World { get; set; }
        public int TotalScripts { get; set; }
        public List<OutlineCat> Categories { get; set; } = new();
    }
    public class OutlineCat
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Color { get; set; }
        public int ScriptCount { get; set; }
        public List<OutlineSub> Subs { get; set; } = new();
        public List<OutlineScript> DirectScripts { get; set; } = new();   // no sub-category
    }
    public class OutlineSub
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public List<OutlineScript> Scripts { get; set; } = new();
    }
    public class OutlineScript
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public DateTime? Edited { get; set; }
        public int LinkCount { get; set; }
        public List<(string Name, string Color)> Tags { get; set; } = new();
    }
}