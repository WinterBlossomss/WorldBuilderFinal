namespace WorldBuilder.Models
{
    public class BuilderView
    {
        public World SelectedWorld { get; set; }
        public ICollection<Script> Scripts { get; set; } = new List<Script>();
        public Script NewScript { get; set; }
        public ICollection<Category> Categories { get; set; } = new List<Category>();
        public Category NewCategory { get; set; }
        public ICollection<SubCategory> SubCategories { get; set; } = new List<SubCategory>();
        public SubCategory NewSubCategory { get; set; }
        public ICollection <Tag> Tags { get; set; } = new List<Tag>();
        public Tag NewTag { get; set; }
    }
}
