# main.py — Código principal do Pico 2W
# ─────────────────────────────────────────────────────────────────

from config import *
from wifi_connect import conectar_wifi
from umqtt.simple import MQTTClient
from machine import Pin, PWM
from utime import sleep, sleep_ms, sleep_us, ticks_diff, ticks_us

pir1 = Pin(27, Pin.IN)

trig1, echo1 = Pin(2, Pin.OUT), Pin(3, Pin.IN)

led_red = Pin(15, Pin.OUT)
buzzer = PWM(Pin(18))
buzzer.duty_u16(0)


def medir_distancia(trig, echo):
    trig.low()
    sleep_us(2)
    trig.high()
    sleep_us(10)
    trig.low()

    timeout_us = 25000
    inicio_espera = ticks_us()

    while echo.value() == 0:
        if ticks_diff(ticks_us(), inicio_espera) > timeout_us:
            return -1

    start = ticks_us()

    while echo.value() == 1:
        if ticks_diff(ticks_us(), start) > timeout_us:
            return -1

    end = ticks_us()
    return (ticks_diff(end, start) * 0.0343) / 2


def calcular_velocidade(trig, echo):
    distancia1 = medir_distancia(trig, echo)
    sleep_ms(50)
    

    if distancia1 < 0:
        return -1

    return abs(distancia2 - distancia1) / 50


def desligar_alertas():
    led_red.value(0)
    buzzer.duty_u16(0)


# ── 1. Conexão WiFi ───────────────────────────────────────────────
if not conectar_wifi(WIFI_SSID, WIFI_PASS):
    print("[MAIN] Sem WiFi. Reinicie o dispositivo.")

else:
    # ── 2. Cliente MQTT ───────────────────────────────────────────
    cliente = MQTTClient(CLIENT_ID, BROKER_IP, port=BROKER_PORT)

    try:
        cliente.connect()
        print(f"[MQTT] Conectado ao broker: {BROKER_IP}")
        print(f"[MQTT] Publicando em: {TOPIC_PUB}")

        # ── 3. Loop principal ─────────────────────────────────────
        while True:
            estado_pir1 = pir1.value()

            if estado_pir1 == 1:
                velocidade1 = calcular_velocidade(trig1, echo1)
                

                if velocidade1 < 0:
                    print("Erro: Sensores Ultrassonicos nao respondendo.")
                    sleep_ms(200)
                    continue

                validos = [v for v in (velocidade1, velocidade2) if v >= 0]
                velocidade_max = max(validos)

                if 0.005 <= velocidade_max <= 0.040:
                    tipo = "ANIMAL SILVESTRE"
                    print(f"ANIMAL SILVESTRE DETECTADO - Vel: {velocidade_max:.3f} cm/ms")
                    led_red.value(1)
                    buzzer.freq(1000)
                    buzzer.duty_u16(32768)
                    sleep(1)
                    desligar_alertas()

                elif 0.040 < velocidade_max <= 0.200:
                    tipo = "VEICULO"
                    print(f"VEICULO DETECTADO - Vel: {velocidade_max:.3f} cm/ms")
                    desligar_alertas()

                else:
                    tipo = "OBJETO COMUM/RUIDO"
                    print(f"OBJETO COMUM/RUIDO - Vel: {velocidade_max:.3f} cm/ms")
                    desligar_alertas()

                # CORRIGIDO: mensagem montada com dados reais da iteração atual
                mensagem = f"TIPO: {tipo} | VEL: {velocidade_max:.3f} cm/ms"
                cliente.publish(TOPIC_PUB, mensagem.encode())
                print(f"[PUB] {mensagem}")

            else:
                desligar_alertas()

            sleep_ms(200)

    except Exception as e:
        print(f"[ERRO] {e}")
        print("[MQTT] Verifique o broker e a conexão WiFi.")

    finally:
        try:
            cliente.disconnect()
            print("[MQTT] Desconectado.")
        except:
            pass
