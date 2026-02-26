<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;

Route::apiResource('products', ProductController::class);
Route::apiResource('orders', OrderController::class)->only([
    'index',
    'show',
    'store',
    'update',
]);
