package com.antigravity.models;

import com.antigravity.proto.RaceFlag;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.HashMap;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Theme extends Model {

  public static final String DEFAULT_THEME_ID = "default_classic_rc_ai";

  private final String name;
  private final boolean isDefault;
  private final Map<String, String> slots;
  private final Map<String, AudioConfig> audioSlots;

  @JsonCreator
  public Theme(
      @JsonProperty("name") String name,
      @JsonProperty("is_default") boolean isDefault,
      @JsonProperty("slots") Map<String, String> slots,
      @JsonProperty("audio_slots") Map<String, AudioConfig> audioSlots,
      @JsonProperty("entity_id") String entityId,
      @JsonProperty("_id") String id) {
    super(id, entityId);
    this.name = name;
    this.isDefault = isDefault;
    this.slots = slots != null ? slots : new HashMap<>();
    this.audioSlots = audioSlots != null ? audioSlots : new HashMap<>();
  }

  public String getName() {
    return name;
  }

  @JsonProperty("is_default")
  public boolean isDefault() {
    return isDefault;
  }

  public Map<String, String> getSlots() {
    return slots;
  }

  @JsonProperty("audio_slots")
  public Map<String, AudioConfig> getAudioSlots() {
    return audioSlots;
  }

  public RaceFlag resolveFlag(String slotKey, RaceFlag fallback) {
    if (slots == null || slotKey == null) {
      return fallback;
    }
    String assetId = slots.get(slotKey);
    if (assetId == null || assetId.isEmpty()) {
      return fallback;
    }
    String lower = assetId.toLowerCase();
    if (lower.contains("green_yellow")
        || lower.contains("yellowgreen")
        || lower.contains("yellow_green")
        || lower.contains("greenyellow")) {
      return RaceFlag.GREEN_YELLOW;
    }
    if (lower.contains("checkered") || lower.contains("checker")) {
      return RaceFlag.CHECKERED;
    }
    if (lower.contains("green")) {
      return RaceFlag.GREEN;
    }
    if (lower.contains("red")) {
      return RaceFlag.RED;
    }
    if (lower.contains("yellow")) {
      return RaceFlag.YELLOW;
    }
    if (lower.contains("white")) {
      return RaceFlag.WHITE;
    }
    if (lower.contains("black")) {
      return RaceFlag.BLACK;
    }
    return fallback;
  }
}
