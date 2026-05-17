<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\EventRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $paginated = Event::where('user_id', $request->user()->id)
            ->orderBy('start_date')
            ->paginate($this->perPage($request));

        return $this->success('Events retrieved successfully', [
            'events' => EventResource::collection($paginated->items()),
            'meta' => $this->meta($paginated),
        ]);
    }

    public function store(EventRequest $request): JsonResponse
    {
        $event = Event::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
        ]);

        return $this->success('Event created successfully', [
            'event' => new EventResource($event),
        ], 201);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $event = Event::where('user_id', $request->user()->id)->findOrFail($id);

        return $this->success('Event retrieved successfully', [
            'event' => new EventResource($event),
        ]);
    }

    public function update(EventRequest $request, string $id): JsonResponse
    {
        $event = Event::where('user_id', $request->user()->id)->findOrFail($id);
        $event->update($request->validated());

        return $this->success('Event updated successfully', [
            'event' => new EventResource($event),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        Event::where('user_id', $request->user()->id)->findOrFail($id)->delete();

        return $this->success('Event deleted successfully', null);
    }

    private function perPage(Request $request): int
    {
        return max(1, min((int) $request->input('limit', 10), 100));
    }

    private function meta($paginated): array
    {
        return [
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ];
    }
}
