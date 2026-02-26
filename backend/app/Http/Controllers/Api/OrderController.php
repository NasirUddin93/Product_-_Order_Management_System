<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function index()
    {
        return response()->json(Order::with('items.product')->get());
    }

    public function show(Order $order)
    {
        return response()->json($order->load('items.product'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_name' => 'required|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        try {
            $order = DB::transaction(function () use ($data) {
                $total = 0;

                $order = Order::create([
                    'customer_name' => $data['customer_name'],
                    'total_amount' => 0, // will update later
                    'status' => 'pending',
                ]);

                foreach ($data['items'] as $item) {
                    $product = Product::lockForUpdate()->find($item['product_id']);
                    if (!$product) {
                        throw new \Exception('Product not found');
                    }

                    if ($product->stock_quantity < $item['quantity']) {
                        throw new \Exception("Insufficient stock for product {$product->id}");
                    }

                    $unitPrice = $product->price;
                    $subtotal = $unitPrice * $item['quantity'];

                    $product->stock_quantity -= $item['quantity'];
                    $product->save();

                    $order->items()->create([
                        'product_id' => $product->id,
                        'quantity' => $item['quantity'],
                        'unit_price' => $unitPrice,
                        'subtotal' => $subtotal,
                    ]);

                    $total += $subtotal;
                }

                $order->total_amount = $total;
                $order->save();

                return $order;
            });
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return response()->json($order, Response::HTTP_CREATED);
    }

    public function update(Request $request, Order $order)
    {
        // allow status change (for cancellation)
        $data = $request->validate([
            'status' => 'required|in:pending,confirmed,cancelled',
        ]);

        if ($order->status === 'cancelled' && $data['status'] === 'cancelled') {
            return response()->json(['message' => 'Order already cancelled'], Response::HTTP_BAD_REQUEST);
        }

        if ($data['status'] === 'cancelled' && $order->status !== 'cancelled') {
            // restore stock
            DB::transaction(function () use ($order, $data) {
                foreach ($order->items as $item) {
                    $product = Product::find($item->product_id);
                    if ($product) {
                        $product->stock_quantity += $item->quantity;
                        $product->save();
                    }
                }

                $order->status = 'cancelled';
                $order->save();
            });
        } else {
            $order->status = $data['status'];
            $order->save();
        }

        return response()->json($order);
    }
}
