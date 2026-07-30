<?php

it('melaporkan layanan sehat beserta status database', function (): void {
    $response = $this->getJson('/api/health');

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.service', 'dams-api')
        ->assertJsonPath('data.status', 'sehat')
        ->assertJsonPath('data.database', 'terhubung');
});

it('memakai envelope response yang seragam', function (): void {
    $response = $this->getJson('/api/health');

    $response->assertJsonStructure(['success', 'message', 'data']);
});

it('dapat diakses tanpa autentikasi', function (): void {
    $this->getJson('/api/health')->assertOk();
});
