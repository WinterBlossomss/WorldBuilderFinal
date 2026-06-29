using System.ComponentModel.DataAnnotations.Schema;
namespace WorldBuilder.Models
{
    public partial class World
    {
        [NotMapped]
        public IFormFile? UploadedPicture { get; set; }
        [NotMapped]
        public bool DeletePicture { get; set; }
    }
}
