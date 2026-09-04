<?php

use App\Http\Controllers\Api\PhotoUploadController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/upload', [PhotoUploadController::class, 'store'])->middleware('api.key');
