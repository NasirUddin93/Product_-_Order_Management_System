<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'sku',
        'price',
        'stock_quantity',
    ];

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }
}
