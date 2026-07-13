using System.ComponentModel.DataAnnotations.Schema;

namespace WorldBuilder.Models
{
    [NotMapped]
    public partial class HomeViewModel
    {
        public List<World>? WorldList { get; set; } = new List<World>();
        public List<UserInfo>? UserList { get; set; } = new List<UserInfo>();
        public List<Category> CategoryList { get; set; } = new List<Category>();
        public List<Tag> TagList { get; set; } = new List<Tag>();

        public int TotalWorlds => WorldList?.Count ?? 0;
        public int TotalUsers => UserList?.Count ?? 0;
        public int TotalCategories => CategoryList?.Count ?? 0;
        public int TotalTags => TagList?.Count ?? 0;
    }
}
