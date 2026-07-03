using System.ComponentModel.DataAnnotations.Schema;

namespace WorldBuilder.Models
{
    public partial class Category
    {
        [NotMapped]
        public int? SubCategoryCount { get; set; }

        [NotMapped]
        public int? ScriptCount { get; set; }
    }
}