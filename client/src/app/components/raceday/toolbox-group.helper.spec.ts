import { CustomWidgetDefinition } from "@app/models/custom-widget.model";

import { ToolboxGroupHelper } from "./toolbox-group.helper";

describe("ToolboxGroupHelper", () => {
  it("should build default Race Coordinator AI group when no widgets are used", () => {
    const used = new Set<string>();
    const customWidgets: CustomWidgetDefinition[] = [];

    const groups = ToolboxGroupHelper.buildToolboxGroups(used, customWidgets);

    expect(groups.length).toBe(1);
    const rcAiGroup = groups[0];
    expect(rcAiGroup.id).toBe(ToolboxGroupHelper.RC_AI_GROUP_ID);
    expect(rcAiGroup.isBuiltIn).toBeTrue();
    expect(rcAiGroup.rootWidgets.length).toBe(0);
    expect(rcAiGroup.rootWidgets).toEqual([]);

    expect(rcAiGroup.subgroups.length).toBe(4);
    expect(rcAiGroup.subgroups.map((sg) => sg.id)).toEqual([
      "actions",
      "standings-heats",
      "titles-info",
      "media-chrome",
    ]);

    const actionsSg = rcAiGroup.subgroups.find((sg) => sg.id === "actions");
    expect(actionsSg?.widgets.length).toBe(19);

    const standingsSg = rcAiGroup.subgroups.find(
      (sg) => sg.id === "standings-heats",
    );
    expect(standingsSg?.widgets.length).toBe(9);
    expect(standingsSg?.widgets.map((w) => w.type)).toContain("lane-view");
    expect(standingsSg?.widgets.map((w) => w.type)).toContain("leaderboard");

    const titlesSg = rcAiGroup.subgroups.find((sg) => sg.id === "titles-info");
    expect(titlesSg?.widgets.length).toBe(7);
    expect(titlesSg?.widgets.map((w) => w.type)).toContain("timer");
    expect(titlesSg?.widgets.map((w) => w.type)).toContain("flag");
    expect(titlesSg?.widgets.map((w) => w.type)).toContain("heat-info");

    const mediaSg = rcAiGroup.subgroups.find((sg) => sg.id === "media-chrome");
    expect(mediaSg?.widgets.length).toBe(4);

    expect(rcAiGroup.totalCount).toBe(39);
  });

  it("should exclude used widgets from root and subgroups", () => {
    const used = new Set<string>([
      "lane-view",
      "action-start-resume",
      "branding",
      "event-name",
    ]);
    const customWidgets: CustomWidgetDefinition[] = [];

    const groups = ToolboxGroupHelper.buildToolboxGroups(used, customWidgets);
    const rcAiGroup = groups[0];

    const standingsSg = rcAiGroup.subgroups.find(
      (sg) => sg.id === "standings-heats",
    );
    expect(
      standingsSg?.widgets.find((w) => w.type === "lane-view"),
    ).toBeUndefined();
    expect(standingsSg?.widgets.length).toBe(8);

    const actionsSg = rcAiGroup.subgroups.find((sg) => sg.id === "actions");
    expect(
      actionsSg?.widgets.find((w) => w.type === "action-start-resume"),
    ).toBeUndefined();
    expect(actionsSg?.widgets.length).toBe(18);

    const titlesSg = rcAiGroup.subgroups.find((sg) => sg.id === "titles-info");
    expect(
      titlesSg?.widgets.find((w) => w.type === "event-name"),
    ).toBeUndefined();
    expect(titlesSg?.widgets.length).toBe(6);

    const mediaSg = rcAiGroup.subgroups.find((sg) => sg.id === "media-chrome");
    expect(mediaSg?.widgets.find((w) => w.type === "branding")).toBeUndefined();
    expect(mediaSg?.widgets.length).toBe(3);

    expect(rcAiGroup.totalCount).toBe(35);
  });

  it("should organize custom widgets into groups, subgroups, and custom-root", () => {
    const used = new Set<string>();
    const customWidgets: CustomWidgetDefinition[] = [
      {
        folderName: "sample-gauge",
        group: "sample",
        manifest: { id: "sample-gauge", name: "Telemetry Gauge" },
      },
      {
        folderName: "sample-delta",
        group: "sample",
        subgroup: "timing",
        manifest: { id: "sample-delta", name: "Lap Delta" },
      },
      {
        folderName: "root-widget",
        group: "custom-root",
        manifest: { id: "root-widget", name: "Legacy Root Widget" },
      },
      {
        folderName: "my-custom",
        group: "community-pack",
        manifest: { id: "my-custom", name: "Community Widget" },
      },
    ];

    const groups = ToolboxGroupHelper.buildToolboxGroups(used, customWidgets);

    // Group order: RC AI, custom-root, then alphabetically: community-pack, sample
    expect(groups.length).toBe(4);
    expect(groups[0].id).toBe(ToolboxGroupHelper.RC_AI_GROUP_ID);
    expect(groups[1].id).toBe(ToolboxGroupHelper.CUSTOM_ROOT_GROUP_ID);
    expect(groups[1].nameKey).toBe("UE_TOOLBOX_GROUP_CUSTOM_ROOT");
    expect(groups[1].rootWidgets.length).toBe(1);
    expect(groups[1].rootWidgets[0].type).toBe("custom:root-widget");

    expect(groups[2].id).toBe("community-pack");
    expect(groups[2].rootWidgets.length).toBe(1);

    expect(groups[3].id).toBe("sample");
    expect(groups[3].rootWidgets.length).toBe(1);
    expect(groups[3].rootWidgets[0].type).toBe("custom:sample-gauge");
    expect(groups[3].subgroups.length).toBe(1);
    expect(groups[3].subgroups[0].id).toBe("sample:timing");
    expect(groups[3].subgroups[0].nameKey).toBe("timing");
    expect(groups[3].subgroups[0].widgets[0].type).toBe("custom:sample-delta");
  });

  it("should filter widgets across groups and subgroups by search term", () => {
    const used = new Set<string>();
    const customWidgets: CustomWidgetDefinition[] = [
      {
        folderName: "sample-telemetry",
        group: "sample",
        manifest: { id: "sample-telemetry", name: "Speed Telemetry" },
      },
    ];

    const translate = (key: string) => {
      if (key === "UE_WIDGET_TYPE_TIMER") return "Race Timer";
      if (key === "UE_WIDGET_TYPE_ACTION_PAUSE") return "Pause Heat";
      return key;
    };

    // Searching "timer" should match timer in titles-info subgroup of RC AI
    const groups = ToolboxGroupHelper.buildToolboxGroups(
      used,
      customWidgets,
      "timer",
      new Map(),
      new Map(),
      translate,
    );

    expect(groups.length).toBe(1);
    const rc = groups[0];
    expect(rc.rootWidgets.length).toBe(0);
    expect(rc.subgroups.length).toBe(1);
    expect(rc.subgroups[0].id).toBe("titles-info");
    expect(rc.subgroups[0].widgets[0].type).toBe("timer");
    expect(rc.subgroups[0].expanded).toBeTrue();
    expect(rc.expanded).toBeTrue();

    // Searching "race state" should match flag widget translated to "Race State"
    const translateRaceState = (key: string) => {
      if (key === "UE_WIDGET_TYPE_FLAG") return "Race State";
      return key;
    };
    const stateGroups = ToolboxGroupHelper.buildToolboxGroups(
      used,
      customWidgets,
      "race state",
      new Map(),
      new Map(),
      translateRaceState,
    );
    expect(stateGroups.length).toBe(1);
    expect(stateGroups[0].subgroups.length).toBe(1);
    expect(stateGroups[0].subgroups[0].id).toBe("titles-info");
    expect(stateGroups[0].subgroups[0].widgets[0].type).toBe("flag");
  });

  it("should auto-expand matching subgroups when searching", () => {
    const used = new Set<string>();
    const customWidgets: CustomWidgetDefinition[] = [];

    const groups = ToolboxGroupHelper.buildToolboxGroups(
      used,
      customWidgets,
      "pause",
      new Map(),
      new Map(),
    );

    expect(groups.length).toBe(1);
    const rc = groups[0];
    expect(rc.subgroups.length).toBe(1);
    expect(rc.subgroups[0].id).toBe("actions");
    expect(rc.subgroups[0].expanded).toBeTrue();
    expect(rc.subgroups[0].widgets.length).toBe(1);
    expect(rc.subgroups[0].widgets[0].type).toBe("action-pause");
  });

  it("should respect manual expansion states when not searching", () => {
    const used = new Set<string>();
    const customWidgets: CustomWidgetDefinition[] = [];

    const groupStates = new Map<string, boolean>([
      [ToolboxGroupHelper.RC_AI_GROUP_ID, false],
    ]);
    const subgroupStates = new Map<string, boolean>([["actions", true]]);

    const groups = ToolboxGroupHelper.buildToolboxGroups(
      used,
      customWidgets,
      "",
      groupStates,
      subgroupStates,
    );

    const rc = groups[0];
    expect(rc.expanded).toBeFalse();
    const actions = rc.subgroups.find((s) => s.id === "actions");
    expect(actions?.expanded).toBeTrue();
    const standings = rc.subgroups.find((s) => s.id === "standings-heats");
    expect(standings?.expanded).toBeFalse();
  });
});
