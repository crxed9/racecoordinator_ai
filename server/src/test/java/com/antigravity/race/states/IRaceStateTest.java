package com.antigravity.race.states;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.antigravity.models.Driver;
import com.antigravity.models.HeatScoring;
import com.antigravity.models.HeatScoring.AllowFinish;
import com.antigravity.models.HeatScoring.FinishMethod;
import com.antigravity.models.Theme;
import com.antigravity.proto.RaceFlag;
import com.antigravity.race.DriverHeatData;
import com.antigravity.race.Heat;
import com.antigravity.race.HeatExecutionManager;
import com.antigravity.race.Race;
import com.antigravity.race.RaceParticipant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.Before;
import org.junit.Test;

public class IRaceStateTest {

  private TestRaceState state;
  private Race race;
  private Heat heat;
  private HeatExecutionManager executionManager;
  private com.antigravity.models.Race raceModel;

  private static class TestRaceState implements IRaceState {
    private RaceFlag flagToReturn = RaceFlag.GREEN;

    public void setFlagToReturn(RaceFlag flag) {
      this.flagToReturn = flag;
    }

    @Override
    public RaceFlag getFlagType(Race race) {
      return flagToReturn;
    }

    @Override
    public void enter(Race race) {}

    @Override
    public void exit(Race race) {}

    @Override
    public void start(Race race) {}

    @Override
    public void pause(Race race) {}

    @Override
    public void nextHeat(Race race) {}

    @Override
    public void restartHeat(Race race) {}

    @Override
    public void skipHeat(Race race) {}

    @Override
    public void deferHeat(Race race) {}

    @Override
    public boolean onLap(int lane, double lapTime, int interfaceId, boolean isDrift) {
      return false;
    }

    @Override
    public void onSegment(int lane, double segmentTime, int interfaceId) {}

    @Override
    public void onCarData(com.antigravity.protocols.CarData carData) {}

    @Override
    public void onCallbutton(Race race, int lane) {}
  }

  @Before
  public void setUp() {
    state = new TestRaceState();
    race = mock(Race.class);
    heat = mock(Heat.class);
    executionManager = mock(HeatExecutionManager.class);

    raceModel =
        new com.antigravity.models.Race.Builder()
            .withHeatScoring(new HeatScoring(FinishMethod.Lap, 10, null, null, AllowFinish.None))
            .build();

    when(race.getRaceModel()).thenReturn(raceModel);
    when(race.getCurrentHeat()).thenReturn(heat);
    when(race.getHeatExecutionManager()).thenReturn(executionManager);
  }

  private DriverHeatData createDriver(String id, String name, double fuelLevel, double penalty) {
    Driver d = new Driver(name, name, id, "1");
    RaceParticipant p = new RaceParticipant(d, id);
    p.setFuelLevel(fuelLevel);
    DriverHeatData dhd = new DriverHeatData(p);
    dhd.setRemainingFalseStartTimePenalty(penalty);
    return dhd;
  }

  @Test
  public void testGetLaneFlagType_NullRaceOrHeat() {
    assertEquals(RaceFlag.GREEN, state.getLaneFlagType(null, 0));

    when(race.getCurrentHeat()).thenReturn(null);
    assertEquals(RaceFlag.GREEN, state.getLaneFlagType(race, 0));
  }

  @Test
  public void testGetLaneFlagType_LaneOutOfBoundsOrNullDriver() {
    List<DriverHeatData> drivers = new ArrayList<>();
    drivers.add(null);
    when(heat.getDrivers()).thenReturn(drivers);

    assertEquals(RaceFlag.GREEN, state.getLaneFlagType(race, -1));
    assertEquals(RaceFlag.GREEN, state.getLaneFlagType(race, 1));
    assertEquals(RaceFlag.GREEN, state.getLaneFlagType(race, 0));
  }

  @Test
  public void testGetLaneFlagType_OutOfFuelAnalog() {
    DriverHeatData dhd = createDriver("d1", "Driver 1", 0, 0);
    when(heat.getDrivers()).thenReturn(Collections.singletonList(dhd));
    when(executionManager.isAnalogFuelEnabled()).thenReturn(true);
    when(executionManager.isDigitalFuelEnabled()).thenReturn(false);

    assertEquals(RaceFlag.BLACK, state.getLaneFlagType(race, 0));
  }

  @Test
  public void testGetLaneFlagType_OutOfFuelDigital() {
    DriverHeatData dhd = createDriver("d1", "Driver 1", -1, 0);
    when(heat.getDrivers()).thenReturn(Collections.singletonList(dhd));
    when(executionManager.isAnalogFuelEnabled()).thenReturn(false);
    when(executionManager.isDigitalFuelEnabled()).thenReturn(true);

    assertEquals(RaceFlag.BLACK, state.getLaneFlagType(race, 0));
  }

  @Test
  public void testGetLaneFlagType_OutOfFuelWithTheme() {
    DriverHeatData dhd = createDriver("d1", "Driver 1", 0, 0);
    when(heat.getDrivers()).thenReturn(Collections.singletonList(dhd));
    when(executionManager.isAnalogFuelEnabled()).thenReturn(true);

    Map<String, String> slots = new HashMap<>();
    slots.put("flag.penalty", "default_flag_red");
    Theme theme = new Theme("Custom", true, slots, null, "theme-1", "id-1");
    when(race.getTheme()).thenReturn(theme);

    assertEquals(RaceFlag.RED, state.getLaneFlagType(race, 0));
  }

  @Test
  public void testGetLaneFlagType_OutOfFuelDisabled_NotPenalized() {
    DriverHeatData dhd = createDriver("d1", "Driver 1", 0, 0);
    when(heat.getDrivers()).thenReturn(Collections.singletonList(dhd));
    when(executionManager.isAnalogFuelEnabled()).thenReturn(false);
    when(executionManager.isDigitalFuelEnabled()).thenReturn(false);

    assertEquals(RaceFlag.GREEN, state.getLaneFlagType(race, 0));
  }

  @Test
  public void testGetLaneFlagType_FalseStartPenalty() {
    DriverHeatData dhd = createDriver("d1", "Driver 1", 100, 3.5);
    when(heat.getDrivers()).thenReturn(Collections.singletonList(dhd));

    assertEquals(RaceFlag.BLACK, state.getLaneFlagType(race, 0));
  }

  @Test
  public void testGetLaneFlagType_DriverFinished_DuringWarmup_ReturnsWarmupFlag() {
    DriverHeatData dhd = createDriver("d1", "Driver 1", 100, 0);
    for (int i = 0; i < 10; i++) {
      dhd.addLap(5.0, false, true);
    }
    when(heat.getDrivers()).thenReturn(Collections.singletonList(dhd));

    // Base flag is GREEN_YELLOW (Warmup)
    state.setFlagToReturn(RaceFlag.GREEN_YELLOW);

    assertEquals(RaceFlag.GREEN_YELLOW, state.getLaneFlagType(race, 0));
  }

  @Test
  public void testGetLaneFlagType_DriverFinished_DuringThemedWarmup_ReturnsWarmupFlag() {
    DriverHeatData dhd = createDriver("d1", "Driver 1", 100, 0);
    for (int i = 0; i < 10; i++) {
      dhd.addLap(5.0, false, true);
    }
    when(heat.getDrivers()).thenReturn(Collections.singletonList(dhd));

    Map<String, String> slots = new HashMap<>();
    slots.put("flag.warmup", "default_flag_green");
    slots.put("flag.driver_finished", "default_flag_yellow");
    Theme theme = new Theme("Custom", true, slots, null, "theme-1", "id-1");
    when(race.getTheme()).thenReturn(theme);

    // Base flag is GREEN (resolved warmup flag)
    state.setFlagToReturn(RaceFlag.GREEN);

    assertEquals(RaceFlag.GREEN, state.getLaneFlagType(race, 0));
  }

  @Test
  public void testGetLaneFlagType_DriverFinished_NotWarmup_ReturnsFinishedFlag() {
    DriverHeatData dhd = createDriver("d1", "Driver 1", 100, 0);
    for (int i = 0; i < 10; i++) {
      dhd.addLap(5.0, false, true);
    }
    when(heat.getDrivers()).thenReturn(Collections.singletonList(dhd));
    state.setFlagToReturn(RaceFlag.GREEN);

    assertEquals(RaceFlag.RED, state.getLaneFlagType(race, 0));
  }

  @Test
  public void testGetLaneFlagType_DriverFinished_ThemedFinishedFlag() {
    DriverHeatData dhd = createDriver("d1", "Driver 1", 100, 0);
    for (int i = 0; i < 10; i++) {
      dhd.addLap(5.0, false, true);
    }
    when(heat.getDrivers()).thenReturn(Collections.singletonList(dhd));
    state.setFlagToReturn(RaceFlag.GREEN);

    Map<String, String> slots = new HashMap<>();
    slots.put("flag.driver_finished", "default_flag_checkered");
    Theme theme = new Theme("Custom", true, slots, null, "theme-1", "id-1");
    when(race.getTheme()).thenReturn(theme);

    assertEquals(RaceFlag.CHECKERED, state.getLaneFlagType(race, 0));
  }

  @Test
  public void testIsDriverFinished_NullInputs() {
    DriverHeatData dhd = createDriver("d1", "Driver 1", 100, 0);
    assertFalse(state.isDriverFinished(null, 0, dhd));
    assertFalse(state.isDriverFinished(race, 0, null));

    when(race.getRaceModel()).thenReturn(null);
    assertFalse(state.isDriverFinished(race, 0, dhd));
  }

  @Test
  public void testIsDriverFinished_NullScoring() {
    DriverHeatData dhd = createDriver("d1", "Driver 1", 100, 0);
    com.antigravity.models.Race modelNoScoring = new com.antigravity.models.Race.Builder().build();
    when(race.getRaceModel()).thenReturn(modelNoScoring);

    assertFalse(state.isDriverFinished(race, 0, dhd));
  }

  @Test
  public void testIsDriverFinished_InHeatOverOrRaceOver() {
    DriverHeatData dhd = createDriver("d1", "Driver 1", 100, 0);
    HeatOver heatOver = new HeatOver();
    RaceOver raceOver = new RaceOver();

    assertTrue(heatOver.isDriverFinished(race, 0, dhd));
    assertTrue(raceOver.isDriverFinished(race, 0, dhd));
  }

  @Test
  public void testIsDriverFinished_InNotStartedOrStarting() {
    DriverHeatData dhd = createDriver("d1", "Driver 1", 100, 0);
    for (int i = 0; i < 20; i++) {
      dhd.addLap(5.0, false, true);
    }
    NotStarted notStarted = new NotStarted();
    Starting starting = new Starting();

    assertFalse(notStarted.isDriverFinished(race, 0, dhd));
    assertFalse(starting.isDriverFinished(race, 0, dhd));
  }

  @Test
  public void testIsDriverFinished_FinishedLanesContainsLane() {
    DriverHeatData dhd = createDriver("d1", "Driver 1", 100, 0);
    Set<Integer> finished = new HashSet<>();
    finished.add(0);
    when(executionManager.getFinishedLanes()).thenReturn(finished);

    assertTrue(state.isDriverFinished(race, 0, dhd));
  }

  @Test
  public void testIsDriverFinished_TimedScoring() {
    DriverHeatData dhd = createDriver("d1", "Driver 1", 100, 0);
    com.antigravity.models.Race timedRace =
        new com.antigravity.models.Race.Builder()
            .withHeatScoring(new HeatScoring(FinishMethod.Timed, 60, null, null, AllowFinish.None))
            .build();
    when(race.getRaceModel()).thenReturn(timedRace);

    when(race.getRaceTime()).thenReturn(5.0f);
    assertFalse(state.isDriverFinished(race, 0, dhd));

    when(race.getRaceTime()).thenReturn(0.0f);
    assertTrue(state.isDriverFinished(race, 0, dhd));

    // NoneAutoSegments
    com.antigravity.models.Race timedAutoRace =
        new com.antigravity.models.Race.Builder()
            .withHeatScoring(
                new HeatScoring(FinishMethod.Timed, 60, null, null, AllowFinish.NoneAutoSegments))
            .build();
    when(race.getRaceModel()).thenReturn(timedAutoRace);

    when(race.getRaceTime()).thenReturn(0.0f);
    assertTrue(state.isDriverFinished(race, 0, dhd));

    when(race.getRaceTime()).thenReturn(10.0f);
    assertFalse(state.isDriverFinished(race, 0, dhd));

    // Allow
    com.antigravity.models.Race allowRace =
        new com.antigravity.models.Race.Builder()
            .withHeatScoring(new HeatScoring(FinishMethod.Timed, 60, null, null, AllowFinish.Allow))
            .build();
    when(race.getRaceModel()).thenReturn(allowRace);
    when(race.getRaceTime()).thenReturn(0.0f);
    assertFalse(state.isDriverFinished(race, 0, dhd));
  }

  @Test
  public void testSyncDriverFlags_NullSafety() {
    state.syncDriverFlags(null);

    when(race.getCurrentHeat()).thenReturn(null);
    state.syncDriverFlags(race);

    when(race.getCurrentHeat()).thenReturn(heat);
    when(heat.getDrivers()).thenReturn(null);
    state.syncDriverFlags(race);
  }

  @Test
  public void testSyncDriverFlags_SetsFlagsOnDrivers() {
    DriverHeatData d1 = createDriver("d1", "Driver 1", 100, 0);
    DriverHeatData d2 = createDriver("d2", "Driver 2", 100, 2.0); // false start -> penalty
    List<DriverHeatData> drivers = new ArrayList<>();
    drivers.add(d1);
    drivers.add(null);
    drivers.add(d2);

    when(heat.getDrivers()).thenReturn(drivers);
    state.setFlagToReturn(RaceFlag.GREEN);

    state.syncDriverFlags(race);

    assertEquals(RaceFlag.GREEN, d1.getFlag());
    assertEquals(RaceFlag.BLACK, d2.getFlag());
  }

  @Test
  public void testHandleLap() {
    when(executionManager.onLap(0, 5.0, 1, false, true, false)).thenReturn(true);
    assertTrue(state.handleLap(race, 0, 5.0, 1, false));
    verify(executionManager).onLap(0, 5.0, 1, false, true, false);

    assertFalse(state.handleLap(null, 0, 5.0, 1, false));

    when(race.getHeatExecutionManager()).thenReturn(null);
    assertFalse(state.handleLap(race, 0, 5.0, 1, false));
  }

  @Test
  public void testCanChangeLane_DefaultIsFalse() {
    assertFalse(state.canChangeLane(race));
  }
}
