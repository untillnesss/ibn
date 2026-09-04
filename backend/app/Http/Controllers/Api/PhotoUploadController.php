<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PhotoUploadController extends Controller
{
    /**
     * Store an uploaded family-member photo and return its public URL.
     *
     * Stored directly under public/uploads (not via the storage:link disk)
     * so the app keeps working on shared hosts that block or silently fail
     * to create symlinks.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $file = $request->file('file');
        $filename = Str::uuid()->toString().'.'.$file->getClientOriginalExtension();

        $file->move(public_path('uploads'), $filename);

        return response()->json([
            'url' => url('uploads/'.$filename),
        ], 201);
    }
}
