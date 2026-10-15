# THE DECEIVER — Bir Jade Vakası

*The Mentalist* havasında, Stardew Valley tarzı 2D piksel grafikli bir dedektif oyunu.
Sen **Jade**’sin: sarı kıvırcık saçlı, üç parçalı takım elbiseli, çayına düşkün ve insanları
bir bakışta “okuyan” bir polis danışmanı. Sunset Koyu’ndaki SSB Karakolu’na her gün **yepyeni,
rastgele üretilmiş** bir cinayet dosyası gelir. Görevin: olay yerine git, ipuçlarını topla,
şüphelileri sorgula, mini görevleri çöz ve katili **kanıtla** bul.

## Nasıl çalıştırılır?

Kurulum yok, derleme yok. `index.html` dosyasını tarayıcıda açman yeterli.

İstersen yerel bir sunucuyla da açabilirsin:

```bash
python3 -m http.server 8000
# tarayıcıda: http://localhost:8000
```

İlerleme tarayıcının `localStorage` alanına otomatik kaydedilir (“Devam Et”).

## Kontroller

| Tuş | Ne yapar |
| --- | --- |
| WASD / Ok tuşları | Yürü (Shift ile koş) |
| E / Boşluk / Enter | Konuş, incele, kullan, diyaloğu ilerlet |
| Q | **Gözlem modu**: odak harcar, olay yerindeki gizli ipuçlarını gösterir |
| F / Tab | Dava dosyası (Dava, Şüpheliler, Deliller, Görevler, Notlar, Harita, Kariyer) |
| 1–9 | Diyalog seçeneği seç |
| M | Ses aç/kapat |

Dokunmatik ekranlarda sol altta joystick, sağ altta **E / Q / F** düğmeleri çıkar.

## Oynanış

1. **Brifing:** Şef Lena kurbanı, olay yerini ve 4 şüpheliyi anlatır. 3 günlük süren başlar.
2. **Olay yeri:** Parıltılara yaklaş, E ile incele. Bazı ipuçları (saç teli, parfüm kokusu, şifreli not)
   yalnızca **Gözlem (Q)** ile görünür. Olay yerinin önündeki komşu bir şey görmüş olabilir.
3. **Adli Tıp:** Dr. Ortiz bulguları söyler; **ölüm nedenini sen bulursun** ve vücut ısısından
   **ölüm saatini hesaplarsın** (37 °C’den saatte ~1 °C soğuma).
4. **Sorgu:** Şüphelilere ilişkilerini, olay gecesi nerede olduklarını ve kimden şüphelendiklerini sor.
   **“Onu oku”** (15 odak) ile elini, sigarasını ve kokusunu fark edersin; sonra Jade bir ayrıntı daha
   görür ve **doğru çıkarımı seçmen** gerekir. Doğru okuma sırlarını (ve bazen gerçek mazeretlerini) açığa çıkarır.
5. **Mazeret kontrolü:** Kafe, otel ve bar çalışanlarına şüphelilerin o gece orada olup olmadığını sor.
   Tanığın verdiği saatleri ölüm saatiyle karşılaştır.
6. **Geçmiş taraması:** Karakolda Grace şüphelilerin ayakkabı numarasını ve aracını bulur.
7. **Mini görevler** (davaya göre değişir):
   - **Parmak izi eşleştirme:** Kısmi deseni şüphelilerin kayıtlı izlerinde ara (birden fazla kişide çıkabilir!).
   - **Şifreli not:** Sezar şifresini çöz; notu kim imzalamış?
   - **Kasa kilidi:** “Bir rakam doğru ve doğru yerde...” türünden ipuçlarıyla 3 haneli şifreyi mantıkla bul.
8. **Suçlama:** Şef Lena’ya (veya delil panosuna) git; **katili, yöntemi ve motifi** seç.
   Doğru katil şarttır; yöntem ve motif yıldız kazandırır. Yanlış suçlama itibar kaybettirir,
   iki yanlışta davadan alınırsın.

**Odak** enerjindir: karakolun mutfağında bedava çay, kafede bergamot çayı, kanepede şekerleme.
Gece 02.00’yi geçirirsen bayılırsın. Çözdüğün davalar para, itibar, unvan ve daha fazla maksimum odak kazandırır.

### Neden “beyin” gerekiyor?

Dava üreticisi her davayı şu kurallarla kurar:

- Olay yerinden çıkan **3 fiziksel iz** (ayak izi, saç, sigara, koku, el, araç arasından) yalnızca katille
  **tam** eşleşir; masumların her biri en az birinde uyuşmaz, bazıları ikisinde uyuşur.
- Mazeret kontrolü, parmak izi ve şifreli not **tek başına iki kişiyi** işaret eder. Bir masum da yalan söyler
  (ama doğru “okunursa” gerçek mazeretini itiraf eder). Biri hiç doğrulanamayan bir mazeret verir.
- Yani tek bir ipucu yetmez; dosyadaki bilgileri **çapraz kontrol etmen** gerekir. Red John yok, sadece davalar var.

## Dosya yapısı

```
index.html        Sayfa iskeleti, HUD, diyalog ve dokunmatik kontroller
css/style.css     Parşömen / ahşap arayüz teması
js/util.js        Tohumlu rastgele sayı üreteci, zaman ve DOM yardımcıları
js/data.js        Tüm metinler: mekânlar, yöntemler, motifler, isimler, soğuk okumalar, karakterler
js/art.js         Kodla çizilen piksel sanatı: karakterler, binalar, ağaçlar, mobilyalar
js/world.js       Kasaba haritası ve iç mekânlar, çarpışma ve kapılar
js/casegen.js     Rastgele ama tutarlı dava üreticisi
js/ui.js          Diyalog kutusu, seçimler, bildirimler, pencereler, ses efektleri
js/minigames.js   Parmak izi, şifre, kasa, suçlama formu, unvanlar
js/dossier.js     Dava dosyası sekmeleri
js/game.js        Oyun döngüsü, hareket, ışıklandırma, NPC’ler, sorgular ve dava akışı
```

Harici kütüphane yok; tek dış kaynak Google Fonts’tan “Pixelify Sans” yazı tipi (çevrimdışıyken yerine
sistem yazı tipi kullanılır).
