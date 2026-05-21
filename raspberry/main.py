# main.py — Código principal do Pico 2W
# ─────────────────────────────────────────────────────────────────

from config import *              # importa todas as variáveis do config.py
from wifi_connect import conectar_wifi
from umqtt.simple import MQTTClient  # biblioteca MQTT nativa do MicroPython
from utime import sleep, ticks_diff, ticks_us
from machine import Pin, PWM

trig = Pin(2, Pin.OUT)
echo = Pin(3, Pin.IN)

pir = Pin(27, Pin.IN)

led_blue = Pin(17, Pin.OUT)
led_red = Pin(15, Pin.OUT)

buzzer = PWM(Pin(18))
buzzer.duty_u16(0)

def medir_distancia():
    trig.low()
    sleep(0.000002)
    trig.high()
    sleep(0.00001)
    trig.low()
    
    start, end = 0, 0
    while echo.value() == 0:
        start = ticks_us()
    while echo.value() == 1:
        end = ticks_us()
    
    distancia = (ticks_diff(end, start) * 0.0343) / 2
    return distancia

# ── 1. Conexão WiFi ───────────────────────────────────────────────
# Se não conectar, não tem sentido tentar o MQTT
if not conectar_wifi(WIFI_SSID, WIFI_PASS):
    print("[MAIN] Sem WiFi. Reinicie o dispositivo.")

else:
    # ── 2. Cliente MQTT ───────────────────────────────────────────
    cliente = MQTTClient(CLIENT_ID, BROKER_IP, port=BROKER_PORT)

    try:
        cliente.connect()
        print(f"[MQTT] Conectado ao broker: {BROKER_IP}")
        print(f"[MQTT] Publicando em: {TOPIC_PUB}")

        # ── 3. Loop principal -> ATENÇÃO!!!─────────────────────────────────────
        contador = 1
        while True:
            movimento = pir.value()
            distancia_total = medir_distancia()

            mensagem = f"MOVIMENTO: {movimento} e DISTÂNCIA: {distancia_total}"
    
            if distancia_total > 50 and distancia_total <= 100:
                print(f"ATENÇÃO! Objeto a {distancia_total:.1f}cm")
                led_red.value(1)
                led_blue.value(0)
                buzzer.freq(2000)
                buzzer.duty_u16(32768)
                sleep(0.1)
                led_red.value(0)
                sleep(0.5)
    
            elif distancia_total <= 50:
                print(f"PERIGO! Objeto a {distancia_total:.1f}cm")
                led_red.value(1)
                led_blue.value(0)
                buzzer.freq(2000)
                buzzer.duty_u16(32768)
                sleep(0.1)
                led_red.value(0)
                sleep(0.1)
        
            elif movimento == 1:
                print("ATENÇÃO: Movimento detectado na pista! ")
                led_red.value(0)
                led_blue.value(1)
                buzzer.freq(800)
                buzzer.duty_u16(10000)
                sleep(0.3)
                led_blue.value(0)
                sleep(0.2)

            else:
                led_red.value(0)
                led_blue.value(0)
                buzzer.duty_u16(0)
    
            sleep(0.5)

            cliente.publish(TOPIC_PUB, mensagem.encode())
            print(f"[PUB] {mensagem}")

            contador += 1
            sleep(3)  # aguarda 3 segundos antes da próxima publicação

    except Exception as e:
        print(f"[ERRO] {e}")
        print("[MQTT] Verifique o broker e a conexão WiFi.")

    finally:
        try:
            cliente.disconnect()
            print("[MQTT] Desconectado.")
        except:
            pass
