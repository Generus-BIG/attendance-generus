// Initial participant data from Sensus GPN.csv
// This data will be seeded on first app load

import { seedParticipants, isSeeded, participantService } from './storage'

const INITIAL_PARTICIPANTS = [
  { name: 'Ardansyah', gender: 'L' as const, kelompok: 'BIG 1' as const, kategori: 'A' as const },
  { name: 'Adelia Khoirina', gender: 'P' as const, kelompok: 'BIG 1' as const, kategori: 'A' as const },
  { name: 'Ezra', gender: 'P' as const, kelompok: 'BIG 1' as const, kategori: 'A' as const },
  { name: 'Faiz Ahmad', gender: 'L' as const, kelompok: 'BIG 1' as const, kategori: 'A' as const },
  { name: 'Herlona', gender: 'P' as const, kelompok: 'BIG 1' as const, kategori: 'A' as const },
  { name: 'Maulan Hafidz W', gender: 'L' as const, kelompok: 'BIG 1' as const, kategori: 'A' as const },
  { name: 'M Irsyad Nur Amri', gender: 'L' as const, kelompok: 'BIG 1' as const, kategori: 'A' as const },
  { name: 'M Yuking Niqobal', gender: 'L' as const, kelompok: 'BIG 1' as const, kategori: 'A' as const },
  { name: 'Noni Rachmatunisa', gender: 'P' as const, kelompok: 'BIG 1' as const, kategori: 'A' as const },
  { name: 'Nurisnaini', gender: 'P' as const, kelompok: 'BIG 1' as const, kategori: 'A' as const },
  { name: 'Ryan', gender: 'L' as const, kelompok: 'BIG 1' as const, kategori: 'A' as const },
  { name: 'Salma Dea Chavidia', gender: 'P' as const, kelompok: 'BIG 1' as const, kategori: 'A' as const },
  { name: 'Savero Afa Valerian Yurcel', gender: 'L' as const, kelompok: 'BIG 1' as const, kategori: 'A' as const },
  { name: 'Zidan', gender: 'L' as const, kelompok: 'BIG 1' as const, kategori: 'A' as const },
  { name: 'Adin Pratama', gender: 'L' as const, kelompok: 'BIG 1' as const, kategori: 'B' as const },
  { name: 'Alfidza Faqih', gender: 'L' as const, kelompok: 'BIG 1' as const, kategori: 'B' as const },
  { name: 'Alifia', gender: 'P' as const, kelompok: 'BIG 1' as const, kategori: 'B' as const },
  { name: 'Ilham Aditya Permana', gender: 'L' as const, kelompok: 'BIG 1' as const, kategori: 'B' as const },
  { name: 'Latif', gender: 'L' as const, kelompok: 'BIG 1' as const, kategori: 'B' as const },
  { name: 'Lulu', gender: 'P' as const, kelompok: 'BIG 1' as const, kategori: 'B' as const },
  { name: 'Naufal Rofi', gender: 'L' as const, kelompok: 'BIG 1' as const, kategori: 'B' as const },
  { name: 'Nadien Amalia', gender: 'P' as const, kelompok: 'BIG 1' as const, kategori: 'B' as const },
  { name: 'Nuhi Khoiri Febriansyah', gender: 'L' as const, kelompok: 'BIG 1' as const, kategori: 'B' as const },
  { name: 'Rizka Maulana Zulkarnain', gender: 'P' as const, kelompok: 'BIG 1' as const, kategori: 'B' as const },
  { name: 'Vallent Pramudita', gender: 'P' as const, kelompok: 'BIG 1' as const, kategori: 'B' as const },
  { name: 'Wildan', gender: 'L' as const, kelompok: 'BIG 1' as const, kategori: 'B' as const },
  { name: 'Yolanda Nisa H', gender: 'P' as const, kelompok: 'BIG 1' as const, kategori: 'B' as const },
  { name: 'Alfian Rahmat Alqodari', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Arsya Haudhy Fathira', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Azka Bilqis Aulia', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Bagus Satria', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Dyna Estu Rahayu', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Embun Sekar Kinari', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Fadhilah Eka Nursita', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Farel Raif', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Farrel Shanrul Fikri', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Faza Rizka Isnia', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Fanny Salsata', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Filqa Talitha N P', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Flavia Tukhoyya Syahmaria', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Intan Ihza Qonia', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Johan Rizky Ramadhan', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Korsela Maisyah', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'M Yudha Febrianto', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Neni Putri Wildani', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Putri Julia Rahayu', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Rakan Tsabat Abbiyu', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Sahlan Azri Permana', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Zaroh Febianti', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'A' as const },
  { name: 'Ananda Putri Octafia', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'B' as const },
  { name: 'Aulia Rizka Sintani', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'B' as const },
  { name: 'Anugrah Tria Ramadani', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'B' as const },
  { name: 'Desita Evin Mardela', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'B' as const },
  { name: 'Erlin Pramudya Rifqi', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'B' as const },
  { name: 'Farel Al Rasyid', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'B' as const },
  { name: 'Irfansyah', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'B' as const },
  { name: 'Jessenia Zafira', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'B' as const },
  { name: 'Khoirul Fatkhul Saifulloh', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'B' as const },
  { name: 'Lutfi Aprianti', gender: 'P' as const, kelompok: 'BIG 2' as const, kategori: 'B' as const },
  { name: 'M Raihan Arjun', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'B' as const },
  { name: 'M Rizky Ramadhani', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'B' as const },
  { name: 'Rayhan Al Rasyid', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'B' as const },
  { name: 'Raihan Tsabita Sabil', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'B' as const },
  { name: 'Sahit Afdulloh', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'B' as const },
  { name: 'Yusuf Abdullah', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'B' as const },
  { name: 'Yusrin Wahyu', gender: 'L' as const, kelompok: 'BIG 2' as const, kategori: 'B' as const },
  { name: 'Andhika Pramudia', gender: 'L' as const, kelompok: 'Cakra' as const, kategori: 'A' as const },
  { name: 'Amanda Putri', gender: 'P' as const, kelompok: 'Cakra' as const, kategori: 'A' as const },
  { name: 'Amara Suci Rizkillah', gender: 'P' as const, kelompok: 'Cakra' as const, kategori: 'A' as const },
  { name: 'Aprilia Asyri Wisdiati', gender: 'P' as const, kelompok: 'Cakra' as const, kategori: 'A' as const },
  { name: 'Fattah Khoiri Hasan', gender: 'L' as const, kelompok: 'Cakra' as const, kategori: 'A' as const },
  { name: 'M Alyansyah Arizky', gender: 'L' as const, kelompok: 'Cakra' as const, kategori: 'A' as const },
  { name: 'Rafa Afiah', gender: 'P' as const, kelompok: 'Cakra' as const, kategori: 'A' as const },
  { name: 'Sintia Wati Nurdian', gender: 'P' as const, kelompok: 'Cakra' as const, kategori: 'A' as const },
  { name: 'Tisa Dian Pamungkas', gender: 'L' as const, kelompok: 'Cakra' as const, kategori: 'A' as const },
  { name: 'Akbar Tri Wahyudi', gender: 'L' as const, kelompok: 'Cakra' as const, kategori: 'B' as const },
  { name: 'Anisa Diyah Ristiani', gender: 'P' as const, kelompok: 'Cakra' as const, kategori: 'B' as const },
  { name: 'Arini Eka S L', gender: 'P' as const, kelompok: 'Cakra' as const, kategori: 'B' as const },
  { name: 'Deri Tri Anggara', gender: 'L' as const, kelompok: 'Cakra' as const, kategori: 'B' as const },
  { name: 'Fakhira Hulwa', gender: 'P' as const, kelompok: 'Cakra' as const, kategori: 'B' as const },
  { name: 'M Dinu Rasyid', gender: 'L' as const, kelompok: 'Cakra' as const, kategori: 'B' as const },
  { name: 'M Febri', gender: 'L' as const, kelompok: 'Cakra' as const, kategori: 'B' as const },
  { name: 'Aliffia Salsabilla', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'A' as const },
  { name: 'Fahmi Fadillah', gender: 'L' as const, kelompok: 'Limo' as const, kategori: 'A' as const },
  { name: 'Fiza Putri Aulia', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'A' as const },
  { name: 'Lisa Wera Juni K', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'A' as const },
  { name: 'Luluk Fauziah', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'A' as const },
  { name: 'M Mihshon Al Mushoffa', gender: 'L' as const, kelompok: 'Limo' as const, kategori: 'A' as const },
  { name: 'M Izzan Maldini', gender: 'L' as const, kelompok: 'Limo' as const, kategori: 'A' as const },
  { name: 'M Risky Ubaidillah', gender: 'L' as const, kelompok: 'Limo' as const, kategori: 'A' as const },
  { name: 'Naila Qurrotul Ain', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'A' as const },
  { name: 'Royan Rosyad', gender: 'L' as const, kelompok: 'Limo' as const, kategori: 'A' as const },
  { name: 'Sarah Fauzani', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'A' as const },
  { name: 'Sina Kania', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'A' as const },
  { name: 'Vania Ardhelia Labibah', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'A' as const },
  { name: 'Wildan Ihsan Wahyudi', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'A' as const },
  { name: 'Zahrita Nurdieni', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'A' as const },
  { name: 'Anindita Ariani Nursuyanto', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'B' as const },
  { name: 'Annisa Nurul Hidayah', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'B' as const },
  { name: 'Dina Ardilla Permana', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'B' as const },
  { name: 'Farhan Fadila', gender: 'L' as const, kelompok: 'Limo' as const, kategori: 'B' as const },
  { name: 'Indah Nurdina', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'B' as const },
  { name: 'Jilan Kania', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'B' as const },
  { name: 'M Fariz Kurnia', gender: 'L' as const, kelompok: 'Limo' as const, kategori: 'B' as const },
  { name: 'Arista Aulia', gender: 'P' as const, kelompok: 'Meruyung' as const, kategori: 'A' as const },
  { name: 'Amanda Amalia Dini', gender: 'P' as const, kelompok: 'Meruyung' as const, kategori: 'A' as const },
  { name: 'Hanifa Qurota Ayun', gender: 'P' as const, kelompok: 'Meruyung' as const, kategori: 'A' as const },
  { name: 'Aryo Izza Mufti', gender: 'L' as const, kelompok: 'Meruyung' as const, kategori: 'B' as const },
  { name: 'Amartia Salsabila', gender: 'P' as const, kelompok: 'Meruyung' as const, kategori: 'B' as const },
  { name: 'Mulya Sakti M', gender: 'L' as const, kelompok: 'Meruyung' as const, kategori: 'B' as const },
  { name: 'Sevina Dian Sabilla', gender: 'P' as const, kelompok: 'Meruyung' as const, kategori: 'B' as const },
  { name: 'Wildanu Firmansyah', gender: 'L' as const, kelompok: 'Meruyung' as const, kategori: 'B' as const },
  { name: 'Kaila Nafisah Zahra', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'AR' as const },
  { name: 'Aysah Febrianti Permana', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'AR' as const },
  { name: 'Nikita Mei Zahra', gender: 'P' as const, kelompok: 'Limo' as const, kategori: 'AR' as const },
]

export function initializeData(): void {
  if (!isSeeded()) {
    seedParticipants(INITIAL_PARTICIPANTS)
  } else {
    // Migration: Ensure the 3 new AR participants are added if they don't exist
    const currentParticipants = participantService.getAll()
    const newNames = ['Kaila Nafisah Zahra', 'Aysah Febrianti Permana', 'Nikita Mei Zahra']

    newNames.forEach((name) => {
      const exists = currentParticipants.some(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      )
      if (!exists) {
        participantService.create({
          name,
          gender: 'P',
          kelompok: 'Limo',
          kategori: 'AR',
          status: 'active',
        })
      }
    })
  }
}

export { INITIAL_PARTICIPANTS }
