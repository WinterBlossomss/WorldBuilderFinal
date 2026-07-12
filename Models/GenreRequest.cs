#nullable disable
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WorldBuilder.Models;

[Table("GenreRequest")]
public partial class GenreRequest
{
    [Key]
    public int GenreReqIDPK { get; set; }

    [Required]
    [StringLength(100)]
    public string GenreReqName { get; set; }

    [StringLength(500)]
    public string GenreReqReason { get; set; }

    public int? GenreReqUserFK { get; set; }

    [Required]
    [StringLength(20)]
    public string GenreReqStatus { get; set; } = "pending";

    [Column(TypeName = "date")]
    public DateTime GenreReqCreatedAt { get; set; }

    [ForeignKey("GenreReqUserFK")]
    public virtual UserInfo GenreReqUserFKNavigation { get; set; }
}
