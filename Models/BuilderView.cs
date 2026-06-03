namespace WorldBuilder.Models
{
    public class BuilderView
    {
        public World SelectedWorld { get; set; }
        public ICollection<Category> Categories { get; set; } = new List<Category>();
        public ICollection<SubCategory> SubCategories { get; set; } = new List<SubCategory>();
        public ICollection <Tag> Tags { get; set; } = new List<Tag>();

    }
}
