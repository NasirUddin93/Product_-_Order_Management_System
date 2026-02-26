<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition()
    {
        return [
            'name' => $this->faker->word,
            'sku' => $this->faker->unique()->ean8,
            'price' => $this->faker->randomFloat(2, 1, 100),
            'stock_quantity' => $this->faker->numberBetween(0, 100),
        ];
    }
}
