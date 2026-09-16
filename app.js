const DB = {
    _get(key) { return JSON.parse(localStorage.getItem(key) || '[]'); },
    _set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },

    getStaff() { return this._get('usc_staff'); },
    saveStaff(data) { this._set('usc_staff', data); },

    getLocations() { return this._get('usc_locations'); },
    saveLocations(data) { this._set('usc_locations', data); },

    getAttendance() { return this._get('usc_attendance'); },
    saveAttendance(data) { this._set('usc_attendance', data); },

    getAdmin() { return localStorage.getItem('usc_admin_pass') || ''; },
    setAdmin(pass) { localStorage.setItem('usc_admin_pass', pass); },

    init() {
        if (this.getStaff().length === 0) {
            this.saveStaff([
                { id: 1, nama: 'Ahmad Fauzi', status: 'aktif' },
                { id: 2, nama: 'Budi Santoso', status: 'aktif' },
                { id: 3, nama: 'Citra Dewi', status: 'aktif' },
                { id: 4, nama: 'Dian Permata', status: 'nonaktif' }
            ]);
        }
        if (this.getLocations().length === 0) {
            this.saveLocations([
                { id: 1, nama_lokasi: 'Kolam UNESA Science Center', latitude: -7.2891, longitude: 112.7891, radius: 150, is_active: 1 }
            ]);
        }
        if (!this.getAdmin()) {
            this.setAdmin('admin123');
        }
    }
};

function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function checkGeofence(lat, lng) {
    const locations = DB.getLocations().filter(l => l.is_active);
    for (const loc of locations) {
        const dist = haversineDistance(lat, lng, loc.latitude, loc.longitude);
        if (dist <= loc.radius) {
            return { valid: true, location: loc, distance: Math.round(dist) };
        }
    }
    let minDist = Infinity;
    locations.forEach(l => {
        const d = haversineDistance(lat, lng, l.latitude, l.longitude);
        if (d < minDist) minDist = d;
    });
    return { valid: false, distance: Math.round(minDist), locations };
}

function getHari(tgl) {
    return ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date(tgl).getDay()];
}

function today() { return new Date().toISOString().split('T')[0]; }
function nowTime() {
    const d = new Date();
    return d.toTimeString().split(' ')[0];
}

function getAttendanceToday(staffId) {
    const t = today();
    return DB.getAttendance().find(a => a.staff_id === staffId && a.tanggal === t);
}

function genId(arr) { return arr.length ? Math.max(...arr.map(a => a.id)) + 1 : 1; }

function exportCSV(data) {
    let csv = '\uFEFFNama;Tanggal;Hari;Jam Masuk;Jam Pulang;Lokasi Lat;Lokasi Lng;Status\n';
    data.forEach(r => {
        csv += `${r.nama};${r.tanggal};${r.hari};${r.jam_checkin};${r.jam_checkout || '-'};${r.lokasi_lat};${r.lokasi_lng};${r.status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rekap_absensi_${today()}.csv`;
    a.click();
}
