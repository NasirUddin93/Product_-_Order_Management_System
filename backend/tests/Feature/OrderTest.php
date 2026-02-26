<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_order_and_deduct_stock()
    {
        $product = Product::factory()->create(['stock_quantity' => 10, 'price' => 5]);

        $response = $this->postJson('/api/orders', [
            'customer_name' => 'Alice',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 3],
            ],
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('orders', ['customer_name' => 'Alice', 'total_amount' => 15]);
        $this->assertDatabaseHas('order_items', ['product_id' => $product->id, 'quantity' => 3, 'unit_price' => 5]);
        $product->refresh();
        $this->assertEquals(7, $product->stock_quantity);
    }

    public function test_cannot_create_order_if_insufficient_stock()
    {
        $product = Product::factory()->create(['stock_quantity' => 2, 'price' => 10]);

        $response = $this->postJson('/api/orders', [
            'customer_name' => 'Bob',
            'items' => [
                ['product_id' => $product->id, 'quantity' => 5],
            ],
        ]);

        $response->assertStatus(400);
        $this->assertDatabaseMissing('orders', ['customer_name' => 'Bob']);
    }

    public function test_cancel_order_restores_stock()
    {
        $product = Product::factory()->create(['stock_quantity' => 5, 'price' => 2]);

        $orderResponse = $this->postJson('/api/orders', [
            'customer_name' => 'Eve',
            'items' => [['product_id' => $product->id, 'quantity' => 4]],
        ]);

        $orderId = $orderResponse->json('id');

        $this->patchJson("/api/orders/{$orderId}", ['status' => 'cancelled'])
            ->assertStatus(200);

        $product->refresh();
        $this->assertEquals(5, $product->stock_quantity);
    }
}
